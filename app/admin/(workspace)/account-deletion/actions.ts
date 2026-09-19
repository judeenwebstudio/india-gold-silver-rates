"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCustomerAdmin } from "@/lib/customer-admin";
import { prisma } from "@/lib/prisma";
import { DeletionError, fulfilDeletion, verifyDeletionRequest } from "@/lib/account-deletion-fulfilment";

export async function reviewRequest(form: FormData) {
  const admin = await requireCustomerAdmin("CUSTOMER_DATA_FULL");
  const id = String(form.get("id") || "");
  const action = form.get("action");
  let result = "error";
  if (id.length <= 100 && (action === "close" || (action === "verify" && form.get("confirmed") === "yes"))) {
    try {
      if (action === "verify") {
        await verifyDeletionRequest(prisma, { requestId: id, adminId: admin.id, confirmed: form.get("confirmed") === "yes", method: String(form.get("method") || "") });
      } else await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(724619032)`;
        const changed = await tx.accountDeletionRequest.updateMany({
          where: { id, status: { in: ["PENDING", "VERIFIED"] } },
          data: { status: "CLOSED", closedAt: new Date(), reviewedBy: admin.id, identifier: null, ipHash: null, contactHash: null },
        });
        if (changed.count !== 1) throw new Error("STALE_REQUEST");
        await tx.adminAuditLog.create({ data: { adminUserId: admin.id, action: "DELETION_REQUEST_CLOSED_WITHOUT_DELETION", targetEntity: "AccountDeletionRequest", targetId: id } });
      });
      result = "saved";
    } catch { /* Never expose contact or database details in error responses. */ }
  }
  revalidatePath("/admin/account-deletion");
  redirect(`/admin/account-deletion?result=${result}`);
}

export async function completeRequest(form: FormData) {
  const admin = await requireCustomerAdmin("CUSTOMER_DATA_FULL");
  const id = String(form.get("id") || "");
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) redirect("/admin/account-deletion?result=error");
  let result = "error";
  try {
    await fulfilDeletion(prisma, {
      requestId: id, adminId: admin.id, confirmation: String(form.get("confirmation") || ""),
      retentionConfirmed: form.get("retentionConfirmed") === "yes",
      externalDataHandled: form.get("externalDataHandled") === "yes",
      retainKyc: form.get("retainKyc") === "yes",
      retainedEvidence: [...new Set(form.getAll("retainedEvidence").map(String))],
      retentionReviewAt: new Date(String(form.get("retentionReviewAt") || "")),
    });
    result = "completed";
  } catch (error) {
    if (error instanceof DeletionError && ["UNSETTLED_RECORDS", "VERIFICATION_REQUIRED", "ACCOUNT_CHANGED", "APPROVAL_REQUIRED", "REVIEW_DATE_REQUIRED"].includes(error.message)) result = error.message;
  }
  revalidatePath("/admin/account-deletion");
  revalidatePath(`/admin/account-deletion/${id}`);
  redirect(`/admin/account-deletion/${id}?result=${result}`);
}
