import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { registerHooks } from "node:module";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { fulfilDeletion, verifyDeletionRequest, type DeletionApproval } from "../../lib/account-deletion-fulfilment";
import { authenticateSchemeUserFromRequest, signSchemeToken } from "../../lib/schemes/user-auth";
import { withActiveCustomer } from "../../lib/customer-delivery";

const connectionString = process.env.ACCOUNT_DELETION_TEST_DATABASE_URL;
// This suite creates fixtures and a fault-injection trigger. Never accept a
// production URL, even if someone points DATABASE_URL at the wrong database.
if (connectionString) {
  const url = new URL(connectionString);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.pathname !== "/ratestack_deletion_test") throw new Error("Use only the disposable local ratestack_deletion_test database");
}
const db = connectionString ? new PrismaClient({ adapter: new PrismaPg({ connectionString, ssl: false, max: 8 }) }) : null;
const integration = (name: string, fn: () => Promise<void>) => test(name, { skip: !db }, fn);
let adminId: string;
const unique = () => randomUUID();

before(async () => {
  if (!db) return;
  // Next aliases this marker in server builds; these tests run server code
  // directly in Node and use the same empty server-side marker.
  registerHooks({ resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "server-only" ? new URL("../../node_modules/next/dist/compiled/server-only/empty.js", import.meta.url).href : specifier, context);
  } });
  // Exercise actual route/Google persistence helpers against this same local
  // client through the application's existing singleton injection point.
  (globalThis as unknown as { prisma: PrismaClient }).prisma = db;
  process.env.AUTH_SECRET = "account-deletion-local-test-secret-only";
  adminId = (await db.adminUser.create({ data: { email: `${unique()}@admin.example`, passwordHash: "test-only", role: "SUPER_ADMIN" } })).id;
  await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION deletion_test_fail_completion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action = 'ACCOUNT_DELETION_COMPLETED' AND NEW."targetId" LIKE 'rollback-%' THEN RAISE EXCEPTION 'injected completion failure'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe(`CREATE TRIGGER deletion_test_fault BEFORE INSERT ON "AdminAuditLog" FOR EACH ROW EXECUTE FUNCTION deletion_test_fail_completion()`);
});
after(async () => {
  if (!db) return;
  await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS deletion_test_fault ON "AdminAuditLog"');
  await db.$executeRawUnsafe('DROP FUNCTION IF EXISTS deletion_test_fail_completion()');
  await db.$disconnect();
});

async function fixture(prefix = "request") {
  const uid = unique();
  const phone = `9${BigInt(`0x${uid.replaceAll("-", "").slice(0, 10)}`).toString().slice(-9).padStart(9, "0")}`;
  const user = await db!.schemeUser.create({ data: {
    fullName: "Private Customer", email: `${uid}@example.com`, phone,
    passwordHash: "private-password-hash", pinHash: "private-pin", profileImageUrl: "https://example.com/private-photo",
    address: "private address", city: "City", state: "State", pincode: "600001",
    emailVerifiedAt: new Date(), mobileVerifiedAt: new Date(),
    kycRecord: { create: { panMasked: "XXX123", documentUrlEncrypted: "external-private-document", status: "APPROVED" } },
    authAccounts: { create: { provider: "GOOGLE", providerAccountId: uid, providerEmail: `${uid}@example.com` } },
  } });
  const request = await db!.accountDeletionRequest.create({ data: { id: `${prefix}-${uid}`, identifier: user.email, contactHash: uid, ipHash: "ip" } });
  const product = await db!.shopProduct.create({ data: { slug: uid, name: "Coin", description: "Fixture", metalType: "GOLD", purity: "K22", availableWeightsGramsJson: [1] } });
  const order = await db!.shopOrder.create({ data: {
    orderNumber: uid, userId: user.id, productId: product.id, productName: "Coin", metalType: "GOLD", purity: "K22", weightGrams: 1, quantity: 1,
    trichyRatePerGramPaise: 100000n, metalValuePaise: 100000n, serviceChargeBasisPoints: 0, serviceChargePaise: 0n, gstBasisPoints: 300, gstPaise: 3000n, totalAmountPaise: 103000n,
    gateway: "RAZORPAY", gatewayPaymentId: `payment-${uid}`, paymentStatus: "SUCCESS", orderStatus: "DELIVERED", invoiceNumber: `INV-${uid}`,
    customerName: user.fullName, customerPhone: user.phone, customerEmail: user.email, addressLine1: "Invoice address", deliveryPincode: "600001", gstNumber: "Required tax identifier",
    cancellationReason: "private note", shipmentTimelineJson: { private: phone }, publicTrackingUrl: "https://example.com/private-tracking",
    paymentVerification: { create: { gateway: "RAZORPAY", result: "VERIFIED", resultMessage: "private reason", verifiedAmountPaise: 103000n, responseJson: { email: user.email } } },
  } });
  const plan = await db!.schemePlan.create({ data: { name: uid, metalType: "GOLD", purity: "K22", tenureMonths: 1, minMonthlyAmountPaise: 100n, maxMonthlyAmountPaise: 10000n, presetAmountsJson: [100], termsVersion: "1", termsContent: "fixture" } });
  const enrollment = await db!.schemeEnrollment.create({ data: { accountNumber: uid, userId: user.id, planId: plan.id, metalType: "GOLD", purity: "K22", tenureMonths: 1, monthlyAmountPaise: 100n, totalScheduledAmountPaise: 100n, remainingInstallmentCount: 0, startDate: new Date(), maturityDate: new Date(), status: "REDEEMED", termsVersion: "1", nominee: { create: { fullName: "Private nominee", relationship: "Family", phone } } } });
  const payment = await db!.paymentOrder.create({ data: { orderId: `s-${uid}`, enrollmentId: enrollment.id, userId: user.id, amountPaise: 100n, gateway: "RAZORPAY", status: "SUCCESS", idempotencyKey: uid } });
  await db!.receipt.create({ data: { receiptNumber: `R-${uid}`, paymentOrderId: payment.id, enrollmentId: enrollment.id, userId: user.id, amountPaise: 100n, paymentDate: new Date(), pdfPath: "required-original-receipt.pdf" } });
  await db!.schemeLedgerEntry.create({ data: { enrollmentId: enrollment.id, type: "REDEMPTION_DEBIT", amountPaise: 100n, balanceAfterPaise: 0n, referenceType: "PAYMENT", referenceId: payment.id, paymentOrderId: payment.id, actorType: "CUSTOMER", actorId: user.id, metadata: { phone } } });
  await db!.deliveryAddress.create({ data: { userId: user.id, fullName: user.fullName, mobile: phone, addressLine1: "Private address", city: "City", district: "District", state: "State", pincode: "600001" } });
  await db!.customerGSTProfile.create({ data: { customerId: user.id, businessName: "Private business", gstNumber: "PRIVATE", billingAddress: "Private billing address" } });
  await db!.customerPlatformActivity.create({ data: { customerId: user.id, platform: "WEB", loginMethod: "EMAIL_PASSWORD", ipHash: "private", userAgent: "private" } });
  await db!.customerWishlist.create({ data: { customerId: user.id, productId: product.id } });
  await db!.customerNotificationPreference.create({ data: { customerId: user.id } });
  await db!.rateAlertPreference.create({ data: { customerId: user.id, metal: "GOLD", alertType: "DAILY_UPDATE" } });
  await db!.pushDeviceToken.create({ data: { customerId: user.id, token: uid } });
  await db!.customerNotification.create({ data: { customerId: user.id, title: "Private", message: "Private message" } });
  await db!.notificationOutbox.create({ data: { customerId: user.id, shopOrderId: order.id, eventType: "TEST", title: "Private", body: "Private", deduplicationKey: uid } });
  await db!.notificationLog.create({ data: { userId: user.id, enrollmentId: enrollment.id, channel: "SMS", eventType: "TEST", title: "Private", body: "Private", metadata: { phone } } });
  await db!.auditLog.create({ data: { actorId: user.id, actorType: "CUSTOMER", action: "PROFILE", targetEntity: "SchemeUser", targetId: user.id, detailsJson: { email: user.email }, ipAddress: "127.0.0.1" } });
  await db!.adminAuditLog.create({ data: { adminUserId: adminId, action: "CUSTOMER_REVIEWED", targetEntity: "SchemeUser", targetId: user.id, detailsJson: { email: user.email }, ipAddress: "127.0.0.1" } });
  await db!.emailAuthToken.create({ data: { userId: user.id, email: user.email!, purpose: "RESET_PASSWORD", tokenHash: uid, expiresAt: new Date(Date.now() + 3600000), resendAvailableAt: new Date() } });
  await db!.passwordResetOtp.create({ data: { userId: user.id, mobileNumber: phone, otpHash: uid, resetTokenHash: uid, expiresAt: new Date(Date.now() + 3600000), resendAvailableAt: new Date() } });
  return { user, request, order, enrollment, uid, product, payment };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
const approval = (f: Fixture, overrides: Partial<DeletionApproval> = {}): DeletionApproval => ({ requestId: f.request.id, adminId, confirmation: `DELETE ${f.request.id}`, retentionConfirmed: true, externalDataHandled: true, retainKyc: false, retainedEvidence: [], retentionReviewAt: new Date(Date.now() + 30 * 86400_000), ...overrides });
const verify = (f: Fixture) => verifyDeletionRequest(db!, { requestId: f.request.id, adminId, confirmed: true, method: "REGISTERED_EMAIL" });
const authRequest = (token: string) => new Request("https://ratestack.in/api/v1/me/profile", { headers: { authorization: `Bearer ${token}` } });

integration("authorization, ownership attestation and separate approval are required", async () => {
  const f = await fixture();
  const viewer = await db!.adminUser.create({ data: { email: `${unique()}@viewer.example`, passwordHash: "test", role: "VIEWER" } });
  await assert.rejects(fulfilDeletion(db!, approval(f, { adminId: viewer.id })), /FORBIDDEN/);
  await assert.rejects(fulfilDeletion(db!, approval(f)), /VERIFICATION_REQUIRED/);
  await assert.rejects(verifyDeletionRequest(db!, { requestId: f.request.id, adminId, confirmed: false, method: "REGISTERED_EMAIL" }), /OWNERSHIP_NOT_CONFIRMED/);
  await verify(f);
  for (const flags of [{ confirmation: "DELETE" }, { retentionConfirmed: false }, { externalDataHandled: false }]) await assert.rejects(fulfilDeletion(db!, approval(f, flags)), /APPROVAL_REQUIRED/);
  assert.equal((await db!.schemeUser.findUniqueOrThrow({ where: { id: f.user.id } })).email, f.user.email);
});

integration("deletion removes personal data/tokens but preserves financial values and required invoice identity", async () => {
  const f = await fixture();
  const other = await fixture();
  await verify(f);
  const oldToken = signSchemeToken(f.user.id, f.user.phone, f.user.fullName, f.user.email!);
  assert.ok(await authenticateSchemeUserFromRequest(authRequest(oldToken)));
  await fulfilDeletion(db!, approval(f));
  const user = await db!.schemeUser.findUniqueOrThrow({ where: { id: f.user.id } });
  assert.ok(user.deletedAt);
  assert.equal(user.isActive, false);
  assert.equal(user.accountStatus, "DELETED");
  assert.equal(user.fullName, "Deleted RateStack account");
  for (const key of ["email", "phone", "passwordHash", "pinHash", "profileImageUrl", "address", "city", "state", "pincode", "kycRecordId", "emailVerifiedAt", "mobileVerifiedAt", "lastLoginAt"] as const) assert.equal(user[key], null, key);
  const counts = await Promise.all([
    db!.deliveryAddress.count({ where: { userId: user.id } }), db!.authAccount.count({ where: { userId: user.id } }), db!.emailAuthToken.count({ where: { userId: user.id } }),
    db!.customerGSTProfile.count({ where: { customerId: user.id } }), db!.customerPlatformActivity.count({ where: { customerId: user.id } }), db!.customerWishlist.count({ where: { customerId: user.id } }),
    db!.customerNotificationPreference.count({ where: { customerId: user.id } }), db!.rateAlertPreference.count({ where: { customerId: user.id } }), db!.pushDeviceToken.count({ where: { customerId: user.id } }),
    db!.customerNotification.count({ where: { customerId: user.id } }), db!.notificationOutbox.count({ where: { customerId: user.id } }),
  ]);
  assert.ok(counts.every(count => count === 0));
  assert.equal(await db!.passwordResetOtp.count({ where: { userId: user.id } }), 0);
  assert.equal(await db!.nominee.count({ where: { enrollmentId: f.enrollment.id } }), 0);
  assert.equal(await db!.notificationLog.count({ where: { userId: user.id } }), 0);
  assert.equal(await db!.kycRecord.count({ where: { id: f.user.kycRecordId! } }), 0);
  const order = await db!.shopOrder.findUniqueOrThrow({ where: { id: f.order.id } });
  assert.equal(order.customerEmail, null); assert.equal(order.customerPhone, null);
  assert.equal(order.customerName, f.order.customerName); assert.equal(order.addressLine1, f.order.addressLine1); assert.equal(order.gstNumber, f.order.gstNumber);
  assert.equal(order.totalAmountPaise, f.order.totalAmountPaise); assert.equal(order.gatewayPaymentId, f.order.gatewayPaymentId); assert.equal(order.invoiceNumber, f.order.invoiceNumber);
  assert.equal(order.shipmentTimelineJson, null); assert.equal(order.publicTrackingUrl, null);
  assert.equal((await db!.schemeLedgerEntry.findFirstOrThrow({ where: { enrollmentId: f.enrollment.id } })).metadata, null);
  assert.equal(await db!.receipt.count({ where: { userId: user.id } }), 1);
  assert.equal(await db!.paymentOrder.count({ where: { userId: user.id } }), 1);
  assert.equal((await db!.auditLog.findFirstOrThrow({ where: { actorId: user.id } })).detailsJson, null);
  const completed = await db!.accountDeletionRequest.findUniqueOrThrow({ where: { id: f.request.id } });
  assert.equal(completed.status, "COMPLETED"); assert.equal(completed.identifier, null); assert.equal(completed.contactHash, null); assert.equal(completed.ipHash, null);
  assert.ok(completed.approvedAt && completed.completedAt);
  assert.equal(await authenticateSchemeUserFromRequest(authRequest(oldToken)), null);
  const cookie = new Request("https://ratestack.in/api/v1/auth/session", { headers: { cookie: `ratestack_scheme_session=${oldToken}` } });
  assert.equal(await authenticateSchemeUserFromRequest(cookie), null);
  const { GET: refresh } = await import("../../app/api/v1/auth/session/route");
  assert.equal((await refresh(cookie)).status, 401);
  assert.equal((await db!.schemeUser.findUniqueOrThrow({ where: { id: other.user.id } })).email, other.user.email);
  assert.equal(await withActiveCustomer(db!, user.id, async () => { throw Error("must not deliver"); }), null);
});

integration("individual required evidence/KYC is retained; non-invoiced personal identifiers are removed", async () => {
  const f = await fixture();
  await db!.shopOrder.update({ where: { id: f.order.id }, data: { invoiceNumber: null, paymentStatus: "FAILED", orderStatus: "PAYMENT_FAILED" } });
  const evidence = await db!.paymentVerification.findUniqueOrThrow({ where: { orderId: f.order.id } });
  await verify(f);
  await fulfilDeletion(db!, approval(f, { retainKyc: true, retainedEvidence: [`paymentVerification:${evidence.id}`] }));
  assert.deepEqual((await db!.paymentVerification.findUniqueOrThrow({ where: { id: evidence.id } })).responseJson, evidence.responseJson);
  assert.equal(await db!.kycRecord.count({ where: { id: f.user.kycRecordId! } }), 1);
  const order = await db!.shopOrder.findUniqueOrThrow({ where: { id: f.order.id } });
  assert.equal(order.customerName, null); assert.equal(order.addressLine1, null); assert.equal(order.gstNumber, null);
});

integration("retries/concurrent completion execute once and cannot target a new registration", async () => {
  const f = await fixture(); await verify(f);
  const results = await Promise.all([fulfilDeletion(db!, approval(f)), fulfilDeletion(db!, approval(f))]);
  assert.deepEqual(results.map(r => r.alreadyCompleted).sort(), [false, true]);
  assert.equal(await db!.adminAuditLog.count({ where: { targetId: f.request.id, action: "ACCOUNT_DELETION_COMPLETED" } }), 1);
  const { signInOrCreateGoogleUser, connectGoogleAccount, GoogleAuthError } = await import("../../lib/google-auth");
  await assert.rejects(connectGoogleAccount(f.user.id, { sub: f.uid, email: f.user.email!, emailVerified: true, fullName: "New" }), error => error instanceof GoogleAuthError && error.code === "ACCOUNT_BLOCKED");
  const google = await signInOrCreateGoogleUser({ sub: f.uid, email: f.user.email!, emailVerified: true, fullName: "New Google account" });
  assert.notEqual(google.user.id, f.user.id);
  assert.ok(await authenticateSchemeUserFromRequest(authRequest(google.token)));
  assert.equal(await db!.shopOrder.count({ where: { userId: google.user.id } }), 0);
  const { POST: register } = await import("../../app/api/v1/auth/register/route");
  const response = await register(new Request("https://ratestack.in/api/v1/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fullName: "New Phone Account", phone: f.user.phone, password: "NewPassword123" }) }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.notEqual(body.data.user.id, f.user.id);
  await fulfilDeletion(db!, approval(f));
  assert.equal((await db!.schemeUser.findUniqueOrThrow({ where: { id: google.user.id } })).isActive, true);
  assert.equal((await db!.schemeUser.findUniqueOrThrow({ where: { id: body.data.user.id } })).isActive, true);
});

integration("failure at audit completion rolls back all deletion and status changes", async () => {
  const f = await fixture("rollback"); await verify(f);
  await assert.rejects(fulfilDeletion(db!, approval(f)), /injected completion failure/);
  const user = await db!.schemeUser.findUniqueOrThrow({ where: { id: f.user.id } });
  assert.equal(user.email, f.user.email); assert.equal(user.deletedAt, null);
  assert.equal(await db!.pushDeviceToken.count({ where: { customerId: user.id } }), 1);
  assert.equal(await db!.authAccount.count({ where: { userId: user.id } }), 1);
  assert.equal((await db!.shopOrder.findUniqueOrThrow({ where: { id: f.order.id } })).customerEmail, f.user.email);
  assert.equal((await db!.accountDeletionRequest.findUniqueOrThrow({ where: { id: f.request.id } })).status, "VERIFIED");
  assert.ok(await authenticateSchemeUserFromRequest(authRequest(signSchemeToken(user.id, user.phone, user.fullName))));
});

integration("deleted customer database guards prevent late writes/reactivation and preserve safe webhook updates", async () => {
  const f = await fixture(); await verify(f); await fulfilDeletion(db!, approval(f));
  await assert.rejects(db!.schemeUser.update({ where: { id: f.user.id }, data: { isActive: true, deletedAt: null } }), /immutable/);
  await assert.rejects(db!.pushDeviceToken.create({ data: { customerId: f.user.id, token: unique() } }), /unavailable/);
  await assert.rejects(db!.authAccount.create({ data: { userId: f.user.id, provider: "GOOGLE", providerAccountId: unique() } }), /unavailable/);
  await assert.rejects(db!.passwordResetOtp.create({ data: { userId: f.user.id, mobileNumber: f.user.phone!, otpHash: unique(), expiresAt: new Date(), resendAvailableAt: new Date() } }), /unavailable/);
  await db!.shopOrder.update({ where: { id: f.order.id }, data: { customerEmail: "must-not-return@example.com", shipmentTimelineJson: { phone: "must-not-return" }, shipmentStatus: "DELIVERED" } });
  const order = await db!.shopOrder.findUniqueOrThrow({ where: { id: f.order.id } });
  assert.equal(order.customerEmail, null); assert.equal(order.shipmentTimelineJson, null); assert.equal(order.shipmentStatus, "DELIVERED");
});

integration("unsettled balances/orders and changed account bindings block deletion", async () => {
  const f = await fixture(); await verify(f);
  await db!.schemeEnrollment.update({ where: { id: f.enrollment.id }, data: { eligiblePurchaseBalancePaise: 1n } });
  await assert.rejects(fulfilDeletion(db!, approval(f)), /UNSETTLED_RECORDS/);
  await db!.schemeEnrollment.update({ where: { id: f.enrollment.id }, data: { eligiblePurchaseBalancePaise: 0n } });
  await db!.shopOrder.update({ where: { id: f.order.id }, data: { orderStatus: "SHIPPED" } });
  await assert.rejects(fulfilDeletion(db!, approval(f)), /UNSETTLED_RECORDS/);
  await db!.shopOrder.update({ where: { id: f.order.id }, data: { orderStatus: "DELIVERED" } });
  await db!.schemeUser.update({ where: { id: f.user.id }, data: { email: `${unique()}@changed.example` } });
  await assert.rejects(fulfilDeletion(db!, approval(f)), /ACCOUNT_CHANGED/);
});

integration("a pre-deletion personal write commits before cleanup or is rejected afterwards", async () => {
  const f = await fixture(); await verify(f);
  let signal!: () => void, release!: () => void;
  const ready = new Promise<void>(resolve => { signal = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const write = db!.$transaction(async tx => {
    await tx.customerNotification.create({ data: { customerId: f.user.id, title: "racing", message: "private" } });
    signal(); await gate;
  });
  await ready;
  const deletion = fulfilDeletion(db!, approval(f));
  release();
  await Promise.all([write, deletion]);
  assert.equal(await db!.customerNotification.count({ where: { customerId: f.user.id } }), 0);
  await assert.rejects(db!.customerNotification.create({ data: { customerId: f.user.id, title: "late", message: "private" } }), /unavailable/);
});
