"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrderAdmin } from "@/lib/admin-orders";
import { evaluateTestOrderCleanup, MAX_TEST_ORDER_CLEANUP, testOrderCleanupSelect, type TestOrderCleanupResult } from "@/lib/test-order-cleanup";

export type CleanupActionState = {
  kind: "idle" | "preview" | "deleted" | "error";
  message: string;
  results: TestOrderCleanupResult[];
};

export const initialCleanupState: CleanupActionState = { kind: "idle", message: "", results: [] };
const idSchema = z.string().cuid();

function parseRequest(formData: FormData) {
  const ids = [...new Set(formData.getAll("cleanupOrderIds").map(String))];
  if (!ids.length || ids.length > MAX_TEST_ORDER_CLEANUP) throw new Error(`Select between 1 and ${MAX_TEST_ORDER_CLEANUP} orders.`);
  ids.forEach(id => idSchema.parse(id));
  const cutoffText = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).parse(formData.get("cleanupCutoff"));
  const cutoff = new Date(`${cutoffText}:00+05:30`);
  if (Number.isNaN(cutoff.getTime()) || cutoff > new Date()) throw new Error("Enter a valid real-test cutoff in the past.");
  const emails = String(formData.get("cleanupEmails") || "").split(/[\s,]+/).map(value => value.trim().toLowerCase()).filter(Boolean);
  emails.forEach(email => z.string().email().parse(email));
  return { ids, cutoff, allowedEmails: emails.length ? new Set(emails) : null };
}

async function inspect(ids: string[], cutoff: Date, allowedEmails: Set<string> | null) {
  const orders = await prisma.shopOrder.findMany({ where: { id: { in: ids } }, select: testOrderCleanupSelect });
  const byId = new Map(orders.map(order => [order.id, order]));
  return ids.map(id => {
    const order = byId.get(id);
    return order ? evaluateTestOrderCleanup(order as never, cutoff, allowedEmails) : { id, orderNumber: id, eligible: false, reasons: ["Order was not found."] };
  });
}

export async function testOrderCleanupAction(_previous: CleanupActionState, formData: FormData): Promise<CleanupActionState> {
  try {
    const admin = await requireOrderAdmin("cleanup");
    if (admin.role !== "SUPER_ADMIN") throw new Error("ADMIN_FORBIDDEN");
    const { ids, cutoff, allowedEmails } = parseRequest(formData);
    const intent = formData.get("cleanupIntent");
    const preview = await inspect(ids, cutoff, allowedEmails);
    const blocked = preview.filter(item => !item.eligible);
    if (intent !== "delete") return { kind: "preview", message: `${preview.length - blocked.length} eligible; ${blocked.length} blocked.`, results: preview };
    if (formData.get("cleanupConfirmation") !== "DELETE") throw new Error("Type DELETE exactly to confirm permanent deletion.");
    if (blocked.length) return { kind: "error", message: "Nothing was deleted because at least one selected order is blocked.", results: preview };

    await prisma.$transaction(async tx => {
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
    });
    revalidatePath("/admin/orders");
    return { kind: "deleted", message: `${ids.length} selected test order${ids.length === 1 ? "" : "s"} deleted.`, results: preview };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : "Cleanup failed closed.", results: [] };
  }
}
