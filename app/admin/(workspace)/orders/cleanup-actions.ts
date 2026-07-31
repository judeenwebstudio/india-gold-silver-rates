"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrderAdmin } from "@/lib/admin-orders";
import { evaluateTestOrderCleanup, MAX_TEST_ORDER_CLEANUP, testOrderCleanupSelect, type TestOrderCleanupResult } from "@/lib/test-order-cleanup";

export type CleanupActionState = {
  kind: "idle" | "deleted" | "error";
  message: string;
  results: TestOrderCleanupResult[];
};

const idSchema = z.string().cuid();

function parseRequest(formData: FormData) {
  const ids = [...new Set(formData.getAll("cleanupOrderIds").map(String))];
  if (!ids.length) throw new Error("NO_ORDERS_SELECTED");
  if (ids.length > MAX_TEST_ORDER_CLEANUP) throw new Error("TOO_MANY_ORDERS_SELECTED");
  if (ids.some(id=>!idSchema.safeParse(id).success)) throw new Error("INVALID_ORDER_ID");
  return { ids };
}

function publicFailure(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  const messages: Record<string,string> = {
    ADMIN_UNAUTHORIZED:"Permission denied: sign in as a SUPER_ADMIN.",ADMIN_FORBIDDEN:"Permission denied: SUPER_ADMIN access is required.",CSRF_REJECTED:"Security validation failed. Refresh the page and try again.",
    NO_ORDERS_SELECTED:"No orders selected.",TOO_MANY_ORDERS_SELECTED:`Select no more than ${MAX_TEST_ORDER_CLEANUP} orders.`,INVALID_ORDER_ID:"One or more selected order IDs are invalid.",CLEANUP_ELIGIBILITY_CHANGED:"An order changed before deletion. Nothing was deleted.",CLEANUP_DELETE_COUNT_MISMATCH:"Transaction failed. No orders were deleted.",
  };
  return messages[code] || "Transaction failed. No orders were deleted.";
}

async function inspect(ids: string[]) {
  const orders = await prisma.shopOrder.findMany({ where: { id: { in: ids } }, select: testOrderCleanupSelect });
  const byId = new Map(orders.map(order => [order.id, order]));
  return ids.map(id => {
    const order = byId.get(id);
    return order ? evaluateTestOrderCleanup(order as never) : { id, orderNumber: id, eligible: false, reasons: ["Order was not found."] };
  });
}

export async function deleteSelectedPendingOrdersAction(_previous:CleanupActionState,formData:FormData):Promise<CleanupActionState>{
  try {
    const admin = await requireOrderAdmin("cleanup");
    if (admin.role !== "SUPER_ADMIN") throw new Error("ADMIN_FORBIDDEN");
    const {ids}=parseRequest(formData);
    console.info("[pending-order-cleanup] request",{selectedCount:ids.length});
    const preview = await inspect(ids);
    const blocked = preview.filter(item => !item.eligible);
    console.info("[pending-order-cleanup] eligibility",{selectedCount:preview.length,eligibleCount:preview.length-blocked.length,blockedCount:blocked.length});
    if (blocked.length) return { kind: "error", message: "Order blocked. Nothing was deleted; see the exact reason below.", results: preview };

    const deletedCount=await prisma.$transaction(async tx => {
      const current = await tx.shopOrder.findMany({ where: { id: { in: ids } }, select: testOrderCleanupSelect });
      const byId = new Map(current.map(order => [order.id, order]));
      const rechecked = ids.map(id => {
        const order = byId.get(id);
        return order ? evaluateTestOrderCleanup(order as never) : { id, orderNumber: id, eligible: false, reasons: ["Order disappeared before deletion."] };
      });
      if (rechecked.some(item => !item.eligible)) throw new Error("CLEANUP_ELIGIBILITY_CHANGED");
      const deleted = await tx.shopOrder.deleteMany({ where: { id: { in: ids } } });
      if (deleted.count !== ids.length) throw new Error("CLEANUP_DELETE_COUNT_MISMATCH");
      await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "PENDING_ORDERS_PERMANENTLY_DELETED", targetEntity: "ShopOrder", targetId: `batch:${ids.length}`, detailsJson: { orderIds: ids, count: ids.length }, ipAddress: admin.ipAddress } });
      return deleted.count;
    });
    console.info("[pending-order-cleanup] committed",{deletedCount});
    revalidatePath("/admin/orders","page");
    return { kind: "deleted", message: `Deletion succeeded: ${deletedCount} order${deletedCount === 1 ? "" : "s"} permanently deleted.`, results: [] };
  } catch (error) {
    console.error("[pending-order-cleanup] failed",{code:error instanceof Error?error.message:"UNKNOWN",errorType:error instanceof Error?error.constructor.name:typeof error});
    return { kind: "error", message: publicFailure(error), results: [] };
  }
}
