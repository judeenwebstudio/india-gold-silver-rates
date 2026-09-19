import Link from "next/link";
import { requireCustomerAdmin } from "@/lib/customer-admin";
import { prisma } from "@/lib/prisma";
import { reviewRequest } from "./actions";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; result?: string; view?: string }> }) {
  await requireCustomerAdmin("CUSTOMER_DATA_FULL");
  const params = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.page || "1", 10) || 1));
  await prisma.accountDeletionRequest.deleteMany({ where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 30 * 86400_000) } } });
  const completed = params.view === "completed";
  const requests = await prisma.accountDeletionRequest.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip: (page - 1) * 50, take: 51, where: { status: completed ? "COMPLETED" : { in: ["PENDING", "VERIFIED"] } } });
  return <div className="space-y-6">
    <h1 className="font-display text-4xl font-bold">Account deletion requests</h1>
    <p className="max-w-3xl text-stone-600">Restricted to customer-data administrators. Independently verify ownership and obtain deletion confirmation through a contact channel already registered to the account. Verification binds this request to that customer ID. Permanent anonymization requires a separate retention review and explicit approval on the request detail page.</p>
    <nav className="flex gap-4"><Link href="/admin/account-deletion">Open requests</Link><Link href="?view=completed">Completed / retention reviews</Link></nav>
    {params.result === "saved" && <p role="status">Review recorded. No account data was changed.</p>}
    {params.result === "error" && <p role="alert">Could not update this request. Refresh and try again; verification must be explicitly confirmed.</p>}
    {!requests.length && <p>No open requests.</p>}
    {requests.slice(0, 50).map((item) => <article key={item.id} className="space-y-3 rounded-2xl border bg-white p-5">
      <h2 className="break-all font-bold">{item.identifier || "Anonymized account"}</h2>
      <p className="text-sm text-stone-600">{item.createdAt.toISOString()} · {item.status} · Reference {item.id}</p>
      {item.retentionReviewAt && <p>Retention review due: {item.retentionReviewAt.toISOString().slice(0, 10)}</p>}
      {(item.status === "VERIFIED" || item.status === "COMPLETED") && <p><Link className="font-bold underline" href={`/admin/account-deletion/${item.id}`}>{item.status === "COMPLETED" ? "View completion" : "Review and approve permanent deletion"}</Link></p>}
      {item.status !== "COMPLETED" && <form action={reviewRequest} className="space-y-3">
        <input type="hidden" name="id" value={item.id} />
        {item.status === "PENDING" && <><label className="block text-sm"><input type="checkbox" name="confirmed" value="yes" /> I independently verified ownership through the account’s existing registered contact channel and obtained explicit deletion confirmation.</label>
          <label className="block">Verified channel <select name="method" className="rounded border p-2"><option value="REGISTERED_EMAIL">Registered email</option><option value="REGISTERED_PHONE">Registered phone</option></select></label>
          <button name="action" value="verify" className="rounded-lg bg-stone-900 px-4 py-2 text-white">Record verification</button></>}
        <p className="text-xs text-stone-500">Close only an invalid or withdrawn request. Closing removes the submitted contact detail; it does not record account deletion as completed.</p>
        <button name="action" value="close" className="text-sm underline">Close invalid or withdrawn request</button>
      </form>}
    </article>)}
    <nav aria-label="Request pages" className="flex gap-4">{page > 1 && <Link href={`?page=${page - 1}&view=${completed ? "completed" : "open"}`}>Previous</Link>}{requests.length > 50 && <Link href={`?page=${page + 1}&view=${completed ? "completed" : "open"}`}>Next</Link>}</nav>
  </div>;
}
