"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";

type Order = { id: string; orderNumber: string; product: string; weightGrams: number; quantity: number; rateUsed: number; serviceCharge: number; gst: number; total: number; gateway: string; transactionId: string | null; paymentStatus: string; orderStatus: string; invoiceNumber: string | null; createdAt: string };
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [login, setLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const token = localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token"); if (!token) { Promise.resolve().then(() => { setLogin(true); setLoading(false); }); return; } fetch("/api/v1/me/orders", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((b) => setOrders(b.data || [])).finally(() => setLoading(false)); }, []);
  return <div className="min-h-screen bg-[#fbfaf7]"><Header/><main className="mx-auto max-w-6xl px-4 py-12"><div className="flex items-end justify-between"><div><h1 className="text-3xl font-black">My Orders</h1><p className="text-stone-600">Direct gold and silver coin purchases.</p></div><Link href="/shop" className="rounded-xl bg-amber-500 px-4 py-3 font-bold">Continue Shopping</Link></div>{loading ? <p className="py-20 text-center">Loading orders…</p> : orders.length === 0 ? <div className="my-10 rounded-2xl border bg-white p-10 text-center">No shop orders yet.</div> : <div className="mt-8 space-y-4">{orders.map((o) => <article key={o.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-black">{o.product} · {o.weightGrams}g × {o.quantity}</h2><p className="text-xs text-stone-500">{o.orderNumber} · {new Date(o.createdAt).toLocaleString("en-IN")}</p></div><div className="text-right"><p className="font-black text-amber-800">₹{o.total.toLocaleString("en-IN")}</p><p className="text-xs font-bold">{o.paymentStatus} · {o.orderStatus}</p></div></div><div className="mt-4 grid gap-2 border-t pt-4 text-sm sm:grid-cols-4"><span>Trichy rate: ₹{o.rateUsed}/g</span><span>Service: ₹{o.serviceCharge}</span><span>GST: ₹{o.gst}</span><span>Gateway: {o.gateway}</span></div><p className="mt-2 text-xs text-stone-500">Transaction: {o.transactionId || "Pending"} · Invoice: {o.invoiceNumber || "Pending"}</p></article>)}</div>}</main><Footer/>{login && <AuthModal initialMode="login" redirectTo="/shop/orders" onClose={() => setLogin(false)} onSuccess={() => setLogin(false)}/>}</div>;
}
