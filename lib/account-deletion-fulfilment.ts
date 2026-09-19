import { Prisma, type PrismaClient } from "@/generated/prisma/client";

export const DELETION_POLICY = "FINANCIAL_MINIMIZE_V1";
export class DeletionError extends Error {}
type Database = Pick<PrismaClient, "$transaction">;
type Tx = Prisma.TransactionClient;
export type EvidenceItem = { key: string; category: string };
export type DeletionApproval = {
  requestId: string;
  adminId: string;
  confirmation: string;
  retentionConfirmed: boolean;
  externalDataHandled: boolean;
  retainKyc: boolean;
  retainedEvidence: string[];
  retentionReviewAt: Date;
};

async function relatedAccountIds(tx: Tx, userId: string) {
  const rows = await Promise.all([
    tx.shopOrder.findMany({ where: { userId }, select: { id: true } }),
    tx.schemeEnrollment.findMany({ where: { userId }, select: { id: true } }),
    tx.redemptionRequest.findMany({ where: { userId }, select: { id: true } }),
    tx.customerGSTProfile.findMany({ where: { customerId: userId }, select: { id: true } }),
    tx.deliveryAddress.findMany({ where: { userId }, select: { id: true } }),
  ]);
  return [userId, ...rows.flat().map(row => row.id)];
}

async function authorize(tx: Tx, adminId: string) {
  const admin = await tx.adminUser.findUnique({ where: { id: adminId }, select: { isActive: true, role: true } });
  if (!admin?.isActive || admin.role !== "SUPER_ADMIN") throw new DeletionError("FORBIDDEN");
}

async function lockRequest(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "AccountDeletionRequest" WHERE "id" = ${id} FOR UPDATE`;
  const request = await tx.accountDeletionRequest.findUnique({ where: { id } });
  if (!request) throw new DeletionError("REQUEST_NOT_FOUND");
  return request;
}

export async function verifyDeletionRequest(db: Database, input: { requestId: string; adminId: string; confirmed: boolean; method: string }) {
  return db.$transaction(async (tx) => {
    await authorize(tx, input.adminId);
    if (!input.confirmed || !["REGISTERED_EMAIL", "REGISTERED_PHONE"].includes(input.method)) throw new DeletionError("OWNERSHIP_NOT_CONFIRMED");
    const request = await lockRequest(tx, input.requestId);
    if (request.status !== "PENDING" || !request.identifier) throw new DeletionError("REQUEST_NOT_PENDING");
    // Bind verification to this immutable customer ID, never to a future owner
    // of the same phone/email. The public request cannot supply a customer ID.
    const user = await tx.schemeUser.findFirst({ where: { deletedAt: null, OR: [{ email: request.identifier }, { phone: request.identifier }] } });
    if (!user || (input.method === "REGISTERED_EMAIL" ? !user.email : !user.phone)) throw new DeletionError("ACCOUNT_OR_CHANNEL_NOT_FOUND");
    await tx.accountDeletionRequest.update({ where: { id: request.id }, data: {
      customerId: user.id, status: "VERIFIED", verifiedAt: new Date(), reviewedBy: input.adminId, verificationMethod: input.method, ipHash: null,
    } });
    await tx.adminAuditLog.create({ data: { adminUserId: input.adminId, action: "DELETION_REQUEST_OWNERSHIP_CONFIRMED", targetEntity: "AccountDeletionRequest", targetId: request.id } });
  });
}

// Evidence is retained only when an administrator selects that specific record.
// Category + opaque ID is sufficient for the deletion audit; no evidence copy.
export async function deletionEvidence(tx: Tx, userId: string, relatedIds?: string[]): Promise<EvidenceItem[]> {
  const related = relatedIds || await relatedAccountIds(tx, userId);
  const order = { order: { userId } };
  const shopOrder = { shopOrder: { userId } };
  const enrollment = { enrollment: { userId } };
  const groups = await Promise.all([
    tx.shopOrder.findMany({ where: { userId }, select: { id: true } }).then(rows => rows.map(r => ({ key: `shopOrder:${r.id}`, category: "Order cancellation / failure / shipment evidence" }))),
    tx.paymentVerification.findMany({ where: order, select: { id: true } }).then(rows => rows.map(r => ({ key: `paymentVerification:${r.id}`, category: "Payment verification response / message" }))),
    tx.adminOrderNote.findMany({ where: order, select: { id: true } }).then(rows => rows.map(r => ({ key: `adminOrderNote:${r.id}`, category: "Order note" }))),
    tx.orderStatusHistory.findMany({ where: order, select: { id: true } }).then(rows => rows.map(r => ({ key: `orderStatusHistory:${r.id}`, category: "Order status messages" }))),
    tx.shipmentTrackingEvent.findMany({ where: order, select: { id: true } }).then(rows => rows.map(r => ({ key: `shipmentTrackingEvent:${r.id}`, category: "Shipment event messages" }))),
    tx.logisticsWebhookEvent.findMany({ where: shopOrder, select: { id: true } }).then(rows => rows.map(r => ({ key: `logisticsWebhookEvent:${r.id}`, category: "Courier webhook evidence" }))),
    tx.shiprocketOperation.findMany({ where: shopOrder, select: { id: true } }).then(rows => rows.map(r => ({ key: `shiprocketOperation:${r.id}`, category: "Courier operation response / error" }))),
    tx.shopRefund.findMany({ where: order, select: { id: true } }).then(rows => rows.map(r => ({ key: `shopRefund:${r.id}`, category: "Refund reason / failure evidence" }))),
    tx.manualPaymentQueue.findMany({ where: enrollment, select: { id: true } }).then(rows => rows.map(r => ({ key: `manualPaymentQueue:${r.id}`, category: "Manual payment proof / reason" }))),
    tx.refundRequest.findMany({ where: enrollment, select: { id: true } }).then(rows => rows.map(r => ({ key: `refundRequest:${r.id}`, category: "Savings refund reasoning" }))),
    tx.redemptionRequest.findMany({ where: { userId }, select: { id: true } }).then(rows => rows.map(r => ({ key: `redemptionRequest:${r.id}`, category: "Redemption delivery / review evidence" }))),
    tx.schemeLedgerEntry.findMany({ where: enrollment, select: { id: true } }).then(rows => rows.map(r => ({ key: `schemeLedgerEntry:${r.id}`, category: "Ledger metadata (amounts always retained)" }))),
    tx.auditLog.findMany({ where: { OR: [{ actorId: userId }, { targetId: { in: related } }] }, select: { id: true } }).then(rows => rows.map(r => ({ key: `auditLog:${r.id}`, category: "Customer audit details / IP" }))),
    tx.adminAuditLog.findMany({ where: { targetId: { in: related } }, select: { id: true } }).then(rows => rows.map(r => ({ key: `adminAuditLog:${r.id}`, category: "Administrative audit evidence / IP" }))),
  ]);
  return groups.flat();
}

export async function fulfilDeletion(db: Database, input: DeletionApproval) {
  return db.$transaction(async (tx) => {
    await authorize(tx, input.adminId);
    if (input.confirmation !== `DELETE ${input.requestId}` || !input.retentionConfirmed || !input.externalDataHandled) throw new DeletionError("APPROVAL_REQUIRED");
    // Shared with intake/review: serializes duplicate requests for one account
    // and ensures no matching personal request can be inserted during cleanup.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(724619032)`;
    const request = await lockRequest(tx, input.requestId);
    if (request.status === "COMPLETED") return { alreadyCompleted: true };
    if (request.status !== "VERIFIED" || !request.customerId || !request.verifiedAt || !request.verificationMethod) throw new DeletionError("VERIFICATION_REQUIRED");
    await tx.$queryRaw`SELECT "id" FROM "SchemeUser" WHERE "id" = ${request.customerId} FOR UPDATE`;
    const user = await tx.schemeUser.findUnique({ where: { id: request.customerId } });
    if (!user || user.deletedAt) throw new DeletionError("ACCOUNT_CHANGED");
    if (request.identifier !== user.email && request.identifier !== user.phone) throw new DeletionError("ACCOUNT_CHANGED");
    const now = new Date();
    if (!Number.isFinite(input.retentionReviewAt.getTime()) || input.retentionReviewAt <= now || input.retentionReviewAt.getTime() > now.getTime() + 366 * 86400_000) throw new DeletionError("REVIEW_DATE_REQUIRED");

    // Do not strand funds or remove contacts needed for an outstanding delivery.
    const unsettled = await Promise.all([
      tx.shopOrder.count({ where: { userId: user.id, OR: [
        { orderStatus: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED", "PAYMENT_FAILED"] } },
        { paymentStatus: { in: ["CREATED", "PENDING"] } },
        { cancellationRefundRequired: true, refunds: { none: { status: "FULLY_REFUNDED" } } },
      ] } }),
      tx.schemeEnrollment.count({ where: { userId: user.id, OR: [{ status: { notIn: ["CANCELLED", "REDEEMED"] } }, { eligiblePurchaseBalancePaise: { not: 0n } }] } }),
      tx.paymentOrder.count({ where: { userId: user.id, status: { in: ["CREATED", "PENDING"] } } }),
      tx.shopRefund.count({ where: { order: { userId: user.id }, status: { in: ["PENDING", "PARTIALLY_REFUNDED", "FAILED"] } } }),
      tx.refundRequest.count({ where: { enrollment: { userId: user.id }, status: { in: ["PENDING", "APPROVED"] } } }),
      tx.redemptionRequest.count({ where: { userId: user.id, status: { notIn: ["COMPLETED", "REJECTED", "EXPIRED"] } } }),
      tx.manualPaymentQueue.count({ where: { enrollment: { userId: user.id }, status: "PENDING_APPROVAL" } }),
    ]);
    if (unsettled.some(Boolean)) throw new DeletionError("UNSETTLED_RECORDS");
    const relatedIds = await relatedAccountIds(tx, user.id);
    const evidence = await deletionEvidence(tx, user.id, relatedIds);
    const allowed = new Set(evidence.map(item => item.key));
    if (input.retainedEvidence.some(key => !allowed.has(key))) throw new DeletionError("INVALID_EVIDENCE_SELECTION");
    const keep = (table: string) => ({ id: { notIn: input.retainedEvidence.filter(key => key.startsWith(`${table}:`)).map(key => key.slice(table.length + 1)) } });
    await tx.accountDeletionRequest.update({ where: { id: request.id }, data: { status: "APPROVED", approvedAt: now, approvedBy: input.adminId } });

    // Reusable identifiers and credentials are removed, not hashed for matching.
    await tx.authAccount.deleteMany({ where: { userId: user.id } });
    await tx.emailAuthToken.deleteMany({ where: { userId: user.id } });
    await tx.passwordResetOtp.deleteMany({ where: { OR: [{ userId: user.id }, ...(user.phone ? [{ mobileNumber: user.phone }] : [])] } });
    await tx.deliveryAddress.deleteMany({ where: { userId: user.id } });
    await tx.customerGSTProfile.deleteMany({ where: { customerId: user.id } });
    await tx.customerPlatformActivity.deleteMany({ where: { customerId: user.id } });
    await tx.customerWishlist.deleteMany({ where: { customerId: user.id } });
    await tx.customerNotificationPreference.deleteMany({ where: { customerId: user.id } });
    await tx.rateAlertPreference.deleteMany({ where: { customerId: user.id } });
    await tx.pushDeviceToken.deleteMany({ where: { customerId: user.id } });
    await tx.customerNotification.deleteMany({ where: { customerId: user.id } });
    await tx.notificationOutbox.deleteMany({ where: { OR: [{ customerId: user.id }, { shopOrder: { userId: user.id } }] } });
    await tx.notificationLog.deleteMany({ where: { OR: [{ userId: user.id }, { enrollmentId: { in: (await tx.schemeEnrollment.findMany({ where: { userId: user.id }, select: { id: true } })).map(row => row.id) } }] } });
    await tx.nominee.deleteMany({ where: { enrollment: { userId: user.id } } });
    const coupons = await tx.coupon.findMany({ where: { specificUserIdsJson: { array_contains: [user.id] } }, select: { id: true, specificUserIdsJson: true } });
    for (const coupon of coupons) if (Array.isArray(coupon.specificUserIdsJson)) await tx.coupon.update({ where: { id: coupon.id }, data: { specificUserIdsJson: coupon.specificUserIdsJson.filter(id => id !== user.id) as Prisma.InputJsonValue } });

    // Preserve original issued/paid invoice identity, amounts and foreign keys.
    // Operational contact information and bearer-like document URLs are erased.
    await tx.shopOrder.updateMany({ where: { userId: user.id }, data: {
      customerPhone: null, customerEmail: null, landmark: null, addressType: null,
      publicTrackingUrl: null, labelUrl: null, manifestUrl: null, shiprocketInvoiceUrl: null,
    } });
    await tx.shopOrder.updateMany({ where: { userId: user.id, ...keep("shopOrder") }, data: {
      shipmentTimelineJson: Prisma.DbNull, failureMessage: null, cancellationReason: null,
      shiprocketFailureReason: null, shiprocketRawStatus: null,
    } });
    await tx.shopOrder.updateMany({ where: { userId: user.id, invoiceNumber: null, paymentStatus: { not: "SUCCESS" } }, data: {
      customerName: null, addressLine1: null, addressLine2: null, deliveryCity: null,
      deliveryDistrict: null, deliveryState: null, deliveryPincode: null, deliveryCountry: null,
      gstBusinessName: null, gstNumber: null, gstBillingAddress: null,
    } });
    const order = { order: { userId: user.id } }, shopOrder = { shopOrder: { userId: user.id } }, enrollment = { enrollment: { userId: user.id } };
    await tx.paymentVerification.updateMany({ where: { ...order, ...keep("paymentVerification") }, data: { responseJson: Prisma.DbNull, resultMessage: "Personal details removed" } });
    await tx.adminOrderNote.updateMany({ where: { ...order, ...keep("adminOrderNote") }, data: { body: "Personal details removed" } });
    await tx.orderStatusHistory.updateMany({ where: { ...order, ...keep("orderStatusHistory") }, data: { publicMessage: "Personal details removed", internalNote: null } });
    await tx.shipmentTrackingEvent.updateMany({ where: { ...order, ...keep("shipmentTrackingEvent") }, data: { publicMessage: "Personal details removed", internalNote: null } });
    await tx.logisticsWebhookEvent.updateMany({ where: { ...shopOrder, ...keep("logisticsWebhookEvent") }, data: { payloadJson: {}, failureReason: null, statusText: null } });
    await tx.shiprocketOperation.updateMany({ where: { ...shopOrder, ...keep("shiprocketOperation") }, data: { responseReference: null, errorMessage: null } });
    await tx.shopRefund.updateMany({ where: { ...order, ...keep("shopRefund") }, data: { reason: "Personal details removed", failureReason: null } });
    await tx.manualPaymentQueue.updateMany({ where: { ...enrollment, ...keep("manualPaymentQueue") }, data: { proofDocumentUrl: null, rejectionReason: null } });
    await tx.refundRequest.updateMany({ where: { ...enrollment, ...keep("refundRequest") }, data: { reasoning: "Personal details removed" } });
    await tx.redemptionRequest.updateMany({ where: { userId: user.id, ...keep("redemptionRequest") }, data: { deliveryAddressJson: Prisma.DbNull, adminNotes: null } });
    await tx.schemeLedgerEntry.updateMany({ where: { ...enrollment, ...keep("schemeLedgerEntry") }, data: { metadata: Prisma.DbNull } });
    await tx.auditLog.updateMany({ where: { OR: [{ actorId: user.id }, { targetId: { in: relatedIds } }], ...keep("auditLog") }, data: { detailsJson: Prisma.DbNull, ipAddress: null } });
    // Admin audit records retain action/actor/target/timestamp, not personal JSON.
    await tx.adminAuditLog.updateMany({ where: { targetId: { in: relatedIds }, ...keep("adminAuditLog") }, data: { detailsJson: Prisma.DbNull, ipAddress: null } });

    await tx.schemeUser.update({ where: { id: user.id }, data: {
      fullName: "Deleted RateStack account", phone: null, email: null, passwordHash: null,
      pinHash: null, profileImageUrl: null, address: null, city: null, state: null, pincode: null,
      emailVerifiedAt: null, mobileVerifiedAt: null, lastLoginAt: null,
      preferredLoginMethod: "NONE", isActive: false, accountStatus: "DELETED", deletedAt: now,
      ...(!input.retainKyc ? { kycRecordId: null } : {}),
    } });
    if (user.kycRecordId && !input.retainKyc) await tx.kycRecord.delete({ where: { id: user.kycRecordId } });
    // Clear all sibling submissions too; a retry can never target a re-registered
    // account through the same contact detail. Only opaque IDs survive.
    await tx.accountDeletionRequest.updateMany({ where: { OR: [{ customerId: user.id }, { identifier: { in: [user.email, user.phone].filter((s): s is string => Boolean(s)) } }] }, data: {
      identifier: null, contactHash: null, ipHash: null, customerId: user.id,
      status: "COMPLETED", completedAt: now, closedAt: now, approvedAt: now, approvedBy: input.adminId,
      policyVersion: DELETION_POLICY, retainKyc: Boolean(user.kycRecordId && input.retainKyc),
      retainEvidence: input.retainedEvidence.length > 0, retainedEvidenceJson: input.retainedEvidence,
      retentionReviewAt: input.retentionReviewAt,
    } });
    await tx.adminAuditLog.create({ data: { adminUserId: input.adminId, action: "ACCOUNT_DELETION_COMPLETED", targetEntity: "AccountDeletionRequest", targetId: request.id, detailsJson: { policy: DELETION_POLICY } } });
    return { alreadyCompleted: false };
  }, { maxWait: 10_000, timeout: 60_000 });
}
