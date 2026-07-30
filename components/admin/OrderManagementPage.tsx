import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dateTime, paise } from "@/lib/admin-shop";
import { ORDER_STATUSES, SHIPMENT_STATUSES } from "@/lib/admin-orders";
import { bulkOrderAction } from "@/app/admin/(workspace)/orders/actions";

type Search={q?:string;payment?:string;status?:string;shipment?:string;product?:string;from?:string;to?:string;sort?:string;page?:string;notice?:string;error?:string};
const badge=(value:string)=>`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide ${value.includes("FAILED")||value.includes("CANCEL")?"bg-red-100 text-red-800":value.includes("DELIVERED")||value.includes("VERIFIED")||value==="SUCCESS"?"bg-emerald-100 text-emerald-800":value.includes("PENDING")?"bg-amber-100 text-amber-900":"bg-stone-100 text-stone-700"}`;

export async function OrderManagementPage({params}:{params:Search}){
  const p=params,page=Math.max(1,Number(p.page)||1),take=25;
  const where={
    ...(p.q?{OR:[{orderNumber:{contains:p.q,mode:"insensitive" as const}},{customerName:{contains:p.q,mode:"insensitive" as const}},{customerPhone:{contains:p.q}},{customerEmail:{contains:p.q,mode:"insensitive" as const}},{user:{is:{fullName:{contains:p.q,mode:"insensitive" as const}}}}]}:{}),
    ...(p.payment?{paymentStatus:p.payment}:{}),...(p.status?{orderStatus:p.status as never}:{}),...(p.shipment?{shipmentStatus:p.shipment as never}:{}),
    ...(p.product?{metalType:p.product as "GOLD"|"SILVER"}:{}),
    ...(p.from||p.to?{createdAt:{...(p.from?{gte:new Date(`${p.from}T00:00:00+05:30`)}:{}),...(p.to?{lte:new Date(`${p.to}T23:59:59+05:30`)}:{})}}:{}),
  };
  const [orders,total]=await Promise.all([prisma.shopOrder.findMany({where,include:{user:true},orderBy:{createdAt:p.sort==="oldest"?"asc":"desc"},skip:(page-1)*take,take}),prisma.shopOrder.count({where})]);
  const pages=Math.max(1,Math.ceil(total/take)),query=new URLSearchParams(Object.entries(p).filter(([,v])=>v!==undefined) as [string,string][]);
  const pageHref=(number:number)=>{const next=new URLSearchParams(query);next.set("page",String(number));return`?${next}`};
  const exportQuery=new URLSearchParams(Object.entries(p).filter(([key,v])=>v&&["payment","status","shipment","product","from","to"].includes(key)) as [string,string][]);
  return <div className="mx-auto max-w-[105rem]">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-amber-700">Commerce operations</p><h1 className="mt-2 font-display text-4xl font-bold">Order Management</h1><p className="mt-2 text-stone-600">{total.toLocaleString("en-IN")} direct coin orders with payment and fulfilment controls.</p></div><Link href={`/api/v1/admin/orders/export?${exportQuery}`} className="rounded-xl bg-stone-950 px-5 py-3 font-bold text-amber-300">Export filtered CSV</Link></div>
    {(p.notice||p.error)&&<div className={`mt-5 rounded-xl p-4 text-sm font-bold ${p.error?"bg-red-50 text-red-800":"bg-emerald-50 text-emerald-800"}`}>{p.error||p.notice}</div>}
    <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-5">
      <input name="q" defaultValue={p.q} placeholder="Order, customer, mobile or email" className="rounded-xl border p-3 xl:col-span-2"/>
      <select name="payment" defaultValue={p.payment||""} className="rounded-xl border p-3"><option value="">All payment statuses</option>{["PENDING","CREATED","SUCCESS","FAILED"].map(x=><option key={x}>{x}</option>)}</select>
      <select name="status" defaultValue={p.status||""} className="rounded-xl border p-3"><option value="">All order statuses</option>{ORDER_STATUSES.map(x=><option key={x}>{x}</option>)}</select>
      <select name="shipment" defaultValue={p.shipment||""} className="rounded-xl border p-3"><option value="">All shipment statuses</option>{SHIPMENT_STATUSES.map(x=><option key={x}>{x}</option>)}</select>
      <select name="product" defaultValue={p.product||""} className="rounded-xl border p-3"><option value="">Gold & Silver</option><option>GOLD</option><option>SILVER</option></select>
      <input type="date" name="from" defaultValue={p.from} className="rounded-xl border p-3"/><input type="date" name="to" defaultValue={p.to} className="rounded-xl border p-3"/>
      <select name="sort" defaultValue={p.sort||"newest"} className="rounded-xl border p-3"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      <button className="rounded-xl bg-amber-400 p-3 font-black">Apply filters</button>
    </form>
    <form action={bulkOrderAction} className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b bg-stone-50 p-3"><b className="text-xs uppercase tracking-wider">Safe bulk action</b><select name="target" className="rounded-lg border p-2 text-sm"><option value="PROCESSING">Mark processing</option><option value="PACKED">Mark packed</option><option value="READY_TO_SHIP">Mark ready to ship</option></select><button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white">Apply selected</button></div>
      <div className="overflow-x-auto"><table className="min-w-[1700px] w-full text-left text-xs"><thead className="bg-stone-950 text-stone-200"><tr>{["","Order ID","Customer","Mobile","Product","Purity","Weight / Qty","Total","Payment","Order status","Shipment","Date","City","Courier","AWB",""].map((x,i)=><th key={`${x}-${i}`} className="p-3">{x}</th>)}</tr></thead><tbody className="divide-y">{orders.map(o=><tr key={o.id} className="hover:bg-amber-50/40"><td className="p-3"><input type="checkbox" name="orderIds" value={o.id} aria-label={`Select ${o.orderNumber}`}/></td><td className="p-3 font-black">{o.orderNumber}</td><td className="p-3">{o.customerName||o.user.fullName}<br/><span className="text-stone-500">{o.customerEmail||o.user.email}</span></td><td className="p-3">{o.customerPhone||o.user.phone||"—"}</td><td className="p-3">{o.productName}</td><td className="p-3">{o.purity}</td><td className="p-3">{o.weightGrams.toString()}g × {o.quantity}</td><td className="p-3 font-black">{paise(o.totalAmountPaise)}</td><td className="p-3">{o.gateway}<br/><span className={badge(o.paymentStatus)}>{o.paymentStatus}</span></td><td className="p-3"><span className={badge(o.orderStatus)}>{o.orderStatus}</span></td><td className="p-3"><span className={badge(o.shipmentStatus)}>{o.shipmentStatus}</span><br/><span className="text-stone-500">{o.shiprocketIntegrationStatus}</span></td><td className="p-3">{dateTime(o.createdAt)}</td><td className="p-3">{o.deliveryCity||"—"}</td><td className="p-3">{o.courierName||o.courierPartner||"—"}</td><td className="p-3">{o.awbCode||o.trackingNumber||"—"}</td><td className="p-3"><Link href={`/admin/orders/${o.id}`} className="rounded-lg bg-amber-400 px-3 py-2 font-black">Manage</Link></td></tr>)}</tbody></table></div>
      {!orders.length&&<p className="p-12 text-center text-stone-500">No orders match these filters.</p>}
    </form>
    <nav className="mt-5 flex items-center justify-between text-sm"><Link aria-disabled={page===1} href={pageHref(Math.max(1,page-1))} className="rounded-lg border bg-white px-4 py-2">Previous</Link><span>Page {page} of {pages}</span><Link aria-disabled={page===pages} href={pageHref(Math.min(pages,page+1))} className="rounded-lg border bg-white px-4 py-2">Next</Link></nav>
  </div>;
}
