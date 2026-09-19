import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCustomerAdmin } from "@/lib/customer-admin";
import { prisma } from "@/lib/prisma";
import { deletionEvidence, DELETION_POLICY } from "@/lib/account-deletion-fulfilment";
import { completeRequest } from "../actions";

export const dynamic = "force-dynamic";
const messages: Record<string, string> = {
  completed: "Deletion completed. Personal data was removed/anonymized and account access revoked.",
  error: "Deletion was not completed. The transaction was rolled back. Refresh and review before retrying.",
  UNSETTLED_RECORDS: "Deletion is blocked by an outstanding order, payment, refund, redemption, or savings balance. Resolve it before retrying.",
  VERIFICATION_REQUIRED: "Verified ownership and an account binding are required before approval.",
  ACCOUNT_CHANGED: "The account or contact changed after verification. Do not proceed; verify a new request.",
  APPROVAL_REQUIRED: "All approval confirmations and the exact confirmation phrase are required.",
  REVIEW_DATE_REQUIRED: "Choose a future retention review date within the next year.",
};

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ result?: string }> }) {
  await requireCustomerAdmin("CUSTOMER_DATA_FULL");
  const { id } = await params;
  const request = await prisma.accountDeletionRequest.findUnique({ where: { id } });
  if (!request) notFound();
  const { result } = await searchParams;
  const user = request.customerId ? await prisma.schemeUser.findUnique({ where: { id: request.customerId }, select: { id: true, kycRecordId: true } }) : null;
  const evidence = user && request.status === "VERIFIED" ? await deletionEvidence(prisma, user.id) : [];
  return <div className="max-w-4xl space-y-6">
    <Link className="underline" href="/admin/account-deletion">Deletion requests</Link>
    <h1 className="font-display text-3xl font-bold">Permanent account deletion</h1>
    <p className="break-all">Request {request.id} · {request.status} · {request.identifier || "Contact data removed"}</p>
    {result && messages[result] && <p role={result === "completed" ? "status" : "alert"} className="rounded-xl border bg-white p-4">{messages[result]}</p>}
    {request.completedAt && <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Completion record</h2><p>Completed: {request.completedAt.toISOString()}</p><p>Policy: {request.policyVersion}. Approved by administrator {request.approvedBy}.</p><p>Required KYC retained: {request.retainKyc ? "yes" : "no"}. Individually retained evidence: {JSON.stringify(request.retainedEvidenceJson || [])}.</p><p>Retention review due: {request.retentionReviewAt?.toISOString().slice(0, 10)}. No personal contact data is retained in this request.</p></section>}
    {request.status === "VERIFIED" && <form action={completeRequest} className="space-y-5 rounded-2xl border bg-white p-6">
      <input type="hidden" name="id" value={request.id} />
      <h2 className="text-xl font-bold">Irreversible approval — {DELETION_POLICY}</h2>
      <p>Profile, credentials, Google links, addresses, preferences, device registrations, reset tokens, and eligible personal data will be removed. Existing sessions will stop working. Financial records and paid/issued invoice identity remain linked to an anonymized, non-loginable account. A new registration will get a separate account with no old history.</p>
      <p>All order phone/email contacts are removed. Paid or issued invoice name, postal and GST details are retained for tax/accounting. Verify that these records are required before approval. Amounts, ledger entries, payment references, receipts, shipment references and status history are preserved. Unselected free-text/JSON evidence is redacted.</p>
      <fieldset className="space-y-2"><legend className="font-bold">Retain only specific evidence required for legal, tax, fraud or accounting purposes</legend>
        <p className="text-sm text-stone-600">Review each source record before selecting it. Leave unnecessary evidence unchecked. Do not use retention as a substitute for resolving open disputes.</p>
        {evidence.map(item => <label key={item.key} className="block break-all text-sm"><input type="checkbox" name="retainedEvidence" value={item.key} /> {item.category} — {item.key}</label>)}
        {!evidence.length && <p>No optional financial evidence records.</p>}
        {user?.kycRecordId && <label className="block"><input type="checkbox" name="retainKyc" value="yes" /> This account’s KYC record is legally required and must be retained.</label>}
      </fieldset>
      <label className="block"><input type="checkbox" name="retentionConfirmed" value="yes" required /> I approve permanent deletion, confirm the owner’s request, have reviewed required invoice identity and selected evidence, and have resolved outstanding obligations and disputes.</label>
      <label className="block"><input type="checkbox" name="externalDataHandled" value="yes" required /> I have removed non-required personal files/data from external storage and processors, including any KYC/proof files selected for deletion, and confirmed backup handling follows the retention policy. Required original invoices/receipts/evidence remain restricted.</label>
      <label className="block">Review retained records by <input type="date" name="retentionReviewAt" required className="ml-2 rounded border p-2" /></label>
      <label className="block">Type <strong>DELETE {request.id}</strong> to confirm<input name="confirmation" required autoComplete="off" className="mt-2 block w-full rounded border p-3" /></label>
      <button className="rounded-xl bg-red-800 px-5 py-3 font-bold text-white">Approve and permanently delete personal data</button>
    </form>}
  </div>;
}
