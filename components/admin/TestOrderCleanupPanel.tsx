"use client";

import { useActionState, useState } from "react";
import { deleteSelectedPendingOrdersAction, type CleanupActionState } from "@/app/admin/(workspace)/orders/cleanup-actions";

type CleanupOrder = { id: string; orderNumber: string; email: string; createdAt: string; paymentStatus: string; orderStatus: string };
const initialCleanupState: CleanupActionState = { kind: "idle", message: "", results: [] };

export function TestOrderCleanupPanel({ orders }: { orders: CleanupOrder[] }) {
  const [selected,setSelected]=useState<string[]>([]);
  const [state,action,pending]=useActionState(deleteSelectedPendingOrdersAction,initialCleanupState);
  const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
  return <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/60 p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[.18em] text-red-700">Super admin safety tool</p>
    <h2 className="mt-1 text-xl font-black text-stone-950">Permanently delete selected orders</h2>
    <p className="mt-2 max-w-4xl text-sm text-stone-700">Only unpaid PAYMENT_PENDING orders with no payment, invoice, refund, shipment, pickup, or fulfilment history can be deleted. Maximum 50 exact order IDs; wildcard deletion is not supported.</p>
    <form action={action} onSubmit={event=>{if(!window.confirm(`Permanently delete ${selected.length} selected unpaid orders? This cannot be undone.`))event.preventDefault()}} className="mt-4 space-y-4">
      {selected.map(id=><input key={id} type="hidden" name="cleanupOrderIds" value={id}/>)}
      <div className="max-h-60 overflow-auto rounded-xl border bg-white p-3">
        {orders.length ? orders.map(order => <label key={order.id} className="flex gap-3 border-b py-2 text-sm last:border-0">
          <input type="checkbox" checked={selected.includes(order.id)} onChange={()=>toggle(order.id)}/>
          <span><b>{order.orderNumber}</b> · {order.email || "No email"}<br/><span className="text-xs text-stone-500">{order.paymentStatus} / {order.orderStatus} · {order.createdAt}</span></span>
        </label>) : <p className="text-sm text-stone-500">No pending orders are visible on this page.</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending||selected.length===0} className="rounded-xl bg-red-700 px-5 py-3 font-black text-white disabled:opacity-50">{pending?"Deleting…":"Permanently delete selected orders"}</button>
      </div>
    </form>
    {state.message && <div role="status" className={`mt-4 rounded-xl p-3 text-sm font-bold ${state.kind === "deleted" ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{state.message}</div>}
    {!!state.results.length && <div className="mt-3 overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-xs"><thead className="bg-stone-950 text-white"><tr><th className="p-3">Order</th><th className="p-3">Result</th><th className="p-3">Reason</th></tr></thead><tbody className="divide-y">{state.results.map(result => <tr key={result.id}><td className="p-3 font-bold">{result.orderNumber}</td><td className={`p-3 font-black ${result.eligible ? "text-emerald-700" : "text-red-700"}`}>{result.eligible ? "ELIGIBLE" : "BLOCKED"}</td><td className="p-3">{result.reasons.join(" ") || "All deletion rules passed."}</td></tr>)}</tbody></table></div>}
  </section>;
}
