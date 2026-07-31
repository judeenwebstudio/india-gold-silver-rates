"use client";

import { useActionState, useState } from "react";
import { deleteTestOrderCleanupAction, previewTestOrderCleanupAction, type CleanupActionState } from "@/app/admin/(workspace)/orders/cleanup-actions";

type CleanupOrder = { id: string; orderNumber: string; email: string; createdAt: string; paymentStatus: string; orderStatus: string };
const initialCleanupState: CleanupActionState = { kind: "idle", message: "", results: [] };

export function TestOrderCleanupPanel({ orders }: { orders: CleanupOrder[] }) {
  const [selected,setSelected]=useState<string[]>([]),[cutoff,setCutoff]=useState(""),[emails,setEmails]=useState(""),[confirmation,setConfirmation]=useState(""),[lastAction,setLastAction]=useState<"preview"|"delete">("preview");
  const [preview,previewAction,previewPending]=useActionState(previewTestOrderCleanupAction,initialCleanupState);
  const [deletion,deleteAction,deletePending]=useActionState(deleteTestOrderCleanupAction,initialCleanupState);
  const pending=previewPending||deletePending,resultState=lastAction==="delete"?deletion:preview;
  const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
  return <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/60 p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[.18em] text-red-700">Super admin safety tool</p>
    <h2 className="mt-1 text-xl font-black text-stone-950">Delete selected test orders</h2>
    <p className="mt-2 max-w-4xl text-sm text-stone-700">Dry-run approval is mandatory and tied to the exact IDs, cutoff and allowlist. Changing any value requires another preview. Maximum 50 exact order IDs; wildcard deletion is not supported.</p>
    <form action={deleteAction} onSubmit={event=>{const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;if(submitter?.value==="delete"&&!window.confirm("Permanently delete only the selected, server-verified test orders? This cannot be undone."))event.preventDefault()}} className="mt-4 space-y-4">
      {selected.map(id=><input key={id} type="hidden" name="cleanupOrderIds" value={id}/>)}
      <input type="hidden" name="cleanupApprovalToken" value={preview.approvalToken||""}/>
      <div className="max-h-60 overflow-auto rounded-xl border bg-white p-3">
        {orders.length ? orders.map(order => <label key={order.id} className="flex gap-3 border-b py-2 text-sm last:border-0">
          <input type="checkbox" checked={selected.includes(order.id)} onChange={()=>toggle(order.id)}/>
          <span><b>{order.orderNumber}</b> · {order.email || "No email"}<br/><span className="text-xs text-stone-500">{order.paymentStatus} / {order.orderStatus} · {order.createdAt}</span></span>
        </label>) : <p className="text-sm text-stone-500">No pending orders are visible on this page.</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm font-bold">Real-test start cutoff (India time)
          <input required type="datetime-local" name="cleanupCutoff" value={cutoff} onChange={event=>setCutoff(event.target.value)} className="mt-1 w-full rounded-xl border bg-white p-3 font-normal"/>
        </label>
        <label className="text-sm font-bold">Known test customer emails (optional allowlist)
          <input name="cleanupEmails" value={emails} onChange={event=>setEmails(event.target.value)} placeholder="test@example.com, developer@example.com" className="mt-1 w-full rounded-xl border bg-white p-3 font-normal"/>
        </label>
      </div>
      <label className="block text-sm font-bold">Type DELETE before permanent deletion
        <input name="cleanupConfirmation" value={confirmation} onChange={event=>setConfirmation(event.target.value)} autoComplete="off" className="mt-1 w-full max-w-sm rounded-xl border bg-white p-3 font-mono font-normal"/>
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" formAction={previewAction} onClick={()=>setLastAction("preview")} disabled={pending || !orders.length} className="rounded-xl border border-stone-400 bg-white px-5 py-3 font-black disabled:opacity-50">{previewPending ? "Checking…" : "Dry-run preview"}</button>
        <button type="submit" name="cleanupSubmit" value="delete" onClick={()=>setLastAction("delete")} disabled={pending || !orders.length} className="rounded-xl bg-red-700 px-5 py-3 font-black text-white disabled:opacity-50">{deletePending?"Deleting…":"Delete selected test orders"}</button>
      </div>
    </form>
    {resultState.message && <div role="status" className={`mt-4 rounded-xl p-3 text-sm font-bold ${resultState.kind === "deleted" ? "bg-emerald-100 text-emerald-900" : resultState.kind === "error" ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-950"}`}>{resultState.message}</div>}
    {!!resultState.results.length && <div className="mt-3 overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-xs"><thead className="bg-stone-950 text-white"><tr><th className="p-3">Order</th><th className="p-3">Result</th><th className="p-3">Reason</th></tr></thead><tbody className="divide-y">{resultState.results.map(result => <tr key={result.id}><td className="p-3 font-bold">{result.orderNumber}</td><td className={`p-3 font-black ${result.eligible ? "text-emerald-700" : "text-red-700"}`}>{result.eligible ? "ELIGIBLE" : "BLOCKED"}</td><td className="p-3">{result.reasons.join(" ") || "All deletion rules passed."}</td></tr>)}</tbody></table></div>}
  </section>;
}
