"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrderAdmin } from "@/lib/admin-orders";
import { evaluateTestOrderCleanup, isDeleteConfirmation, MAX_TEST_ORDER_CLEANUP, parseIndiaCleanupCutoff, testOrderCleanupSelect, type TestOrderCleanupResult } from "@/lib/test-order-cleanup";

export type CleanupActionState = {
  kind: "idle" | "preview" | "deleted" | "error";
  message: string;
  results: TestOrderCleanupResult[];
  approvalToken?: string;
};

const idSchema = z.string().cuid();

function parseRequest(formData: FormData) {
  const ids = [...new Set(formData.getAll("cleanupOrderIds").map(String))];
  if (!ids.length) throw new Error("NO_ORDERS_SELECTED");
  if (ids.length > MAX_TEST_ORDER_CLEANUP) throw new Error("TOO_MANY_ORDERS_SELECTED");
  if (ids.some(id=>!idSchema.safeParse(id).success)) throw new Error("INVALID_ORDER_ID");
  const cutoffText = String(formData.get("cleanupCutoff") || "");
  const cutoff=parseIndiaCleanupCutoff(cutoffText);
  const emails = String(formData.get("cleanupEmails") || "").split(/[\s,]+/).map(value => value.trim().toLowerCase()).filter(Boolean);
  if(emails.some(email=>!z.string().email().safeParse(email).success))throw new Error("INVALID_TEST_EMAIL_ALLOWLIST");
  return { ids, cutoff, allowedEmails: emails.length ? new Set(emails) : null, approvalToken: String(formData.get("cleanupApprovalToken") || "") };
}

type CleanupRequest = ReturnType<typeof parseRequest>;
function approvalSignature(adminId: string, request: CleanupRequest) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("CLEANUP_CONFIGURATION_ERROR");
  const payload = JSON.stringify({ adminId, ids: [...request.ids].sort(), cutoff: request.cutoff.toISOString(), emails: [...(request.allowedEmails || [])].sort() });
  return createHmac("sha256", secret).update(payload).digest("hex");
}
function validApproval(actual: string, expected: string) { return Boolean(actual) && actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected)); }

function publicFailure(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const messages: Record<string,string> = {
    ADMIN_UNAUTHORIZED:"Permission denied: sign in as a SUPER_ADMIN.",ADMIN_FORBIDDEN:"Permission denied: SUPER_ADMIN access is required.",CSRF_REJECTED:"Security validation failed. Refresh the page and try again.",
    NO_ORDERS_SELECTED:"No orders selected.",TOO_MANY_ORDERS_SELECTED:`Select no more than ${MAX_TEST_ORDER_CLEANUP} orders.`,INVALID_ORDER_ID:"One or more selected order IDs are invalid.",INVALID_CUTOFF:"Cutoff is invalid. Enter the real-test start date and time in India time.",INVALID_TEST_EMAIL_ALLOWLIST:"The optional test-email allowlist contains an invalid email.",CLEANUP_DRY_RUN_REQUIRED:"Dry-run required. Preview the exact selection again before deleting.",
    CLEANUP_CONFIRMATION_INCORRECT:"Confirmation incorrect. Type DELETE exactly.",CLEANUP_ELIGIBILITY_CHANGED:"An order changed after preview. Nothing was deleted; run the dry-run again.",CLEANUP_DELETE_COUNT_MISMATCH:"Transaction failed. No orders were deleted.",CLEANUP_CONFIGURATION_ERROR:"Cleanup configuration is incomplete. Contact the administrator.",
  };
  return messages[code] || "Transaction failed. No orders were deleted.";
}

async function inspect(ids: string[], cutoff: Date, allowedEmails: Set<string> | null) {
  const orders = await prisma.shopOrder.findMany({ where: { id: { in: ids } }, select: testOrderCleanupSelect });
  const byId = new Map(orders.map(order => [order.id, order]));
  return ids.map(id => {
    const order = byId.get(id);
    return order ? evaluateTestOrderCleanup(order as never, cutoff, allowedEmails) : { id, orderNumber: id, eligible: false, reasons: ["Order was not found."] };
  });
}

async function runCleanup(mode:"preview"|"delete",formData:FormData):Promise<CleanupActionState>{
  try {
    const admin = await requireOrderAdmin("cleanup");
    if (admin.role !== "SUPER_ADMIN") throw new Error("ADMIN_FORBIDDEN");
    const request=parseRequest(formData),{ids,cutoff,allowedEmails}=request;
    console.info("[test-order-cleanup] request",{mode,selectedCount:ids.length,cutoff:cutoff.toISOString(),allowlistCount:allowedEmails?.size||0,confirmationValid:isDeleteConfirmation(formData.get("cleanupConfirmation")),approvalPresent:Boolean(request.approvalToken)});
    const preview = await inspect(ids, cutoff, allowedEmails);
    const blocked = preview.filter(item => !item.eligible);
    console.info("[test-order-cleanup] eligibility",{mode,selectedCount:preview.length,eligibleCount:preview.length-blocked.length,blockedCount:blocked.length});
    if(mode==="preview")return{kind:"preview",message:blocked.length?`${preview.length-blocked.length} eligible; ${blocked.length} blocked. Nothing has been deleted.`:`${preview.length} eligible. Dry-run approved; type DELETE and use the delete button.`,results:preview,approvalToken:blocked.length?undefined:approvalSignature(admin.id,request)};
    if(!validApproval(request.approvalToken,approvalSignature(admin.id,request)))throw new Error("CLEANUP_DRY_RUN_REQUIRED");
    if (!isDeleteConfirmation(formData.get("cleanupConfirmation"))) throw new Error("CLEANUP_CONFIRMATION_INCORRECT");
    if (blocked.length) return { kind: "error", message: "Order blocked. Nothing was deleted; see the exact reason below.", results: preview };

    const deletedCount=await prisma.$transaction(async tx => {
      const current = await tx.shopOrder.findMany({ where: { id: { in: ids } }, select: testOrderCleanupSelect });
      const byId = new Map(current.map(order => [order.id, order]));
      const rechecked = ids.map(id => {
        const order = byId.get(id);
        return order ? evaluateTestOrderCleanup(order as never, cutoff, allowedEmails) : { id, orderNumber: id, eligible: false, reasons: ["Order disappeared before deletion."] };
      });
      if (rechecked.some(item => !item.eligible)) throw new Error("CLEANUP_ELIGIBILITY_CHANGED");
      const deleted = await tx.shopOrder.deleteMany({ where: { id: { in: ids } } });
      if (deleted.count !== ids.length) throw new Error("CLEANUP_DELETE_COUNT_MISMATCH");
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "TEST_ORDERS_DELETED", targetEntity: "ShopOrder", targetId: `batch:${ids.length}`, detailsJson: { orderIds: ids, cutoff: cutoff.toISOString(), count: ids.length }, ipAddress: admin.ipAddress } });
      return deleted.count;
    });
    console.info("[test-order-cleanup] committed",{deletedCount});
    revalidatePath("/admin/orders","page");
    return { kind: "deleted", message: `Deletion succeeded: ${deletedCount} test order${deletedCount === 1 ? "" : "s"} deleted.`, results: [] };
  } catch (error) {
    console.error("[test-order-cleanup] failed",{mode,code:error instanceof Error?error.message:"UNKNOWN",errorType:error instanceof Error?error.constructor.name:typeof error});
    return { kind: "error", message: publicFailure(error), results: [] };
  }
}

export async function previewTestOrderCleanupAction(_previous:CleanupActionState,formData:FormData){return runCleanup("preview",formData)}
export async function deleteTestOrderCleanupAction(_previous:CleanupActionState,formData:FormData){return runCleanup("delete",formData)}
