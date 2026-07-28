"use client";
import { useEffect, useState } from "react";

type Product = { id: string; name: string; description: string; imageUrl: string | null; weights: number[]; serviceChargePercent: number; gstPercent: number; isActive: boolean };
export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/v1/admin/products").then((r) => r.json()).then((d) => setProducts(d.products || [])); }, []);
  function patch(id: string, changes: Partial<Product>) { setProducts((all) => all.map((p) => p.id === id ? { ...p, ...changes } : p)); }
  async function save(product: Product) {
    setMessage("Saving…");
    const res = await fetch("/api/v1/admin/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product) });
    setMessage(res.ok ? `${product.name} updated.` : "Unable to update product.");
  }
  return <main className="space-y-6"><div><h1 className="text-2xl font-black">Shop Products</h1><p className="text-sm text-stone-600">Manage the two customer-visible direct-purchase products.</p></div><div className="grid gap-5 lg:grid-cols-2">{products.map((p) => <section key={p.id} className="space-y-4 rounded-2xl border bg-white p-5"><div className="flex justify-between"><h2 className="text-lg font-bold">{p.name}</h2><label className="text-sm"><input type="checkbox" checked={p.isActive} onChange={(e) => patch(p.id, { isActive: e.target.checked })}/> Enabled</label></div><label className="block text-sm font-bold">Description<textarea className="mt-1 w-full rounded-xl border p-3 font-normal" value={p.description} onChange={(e) => patch(p.id, { description: e.target.value })}/></label><label className="block text-sm font-bold">Image URL<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={p.imageUrl || ""} onChange={(e) => patch(p.id, { imageUrl: e.target.value || null })}/></label><label className="block text-sm font-bold">Available weights (grams)<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={p.weights.join(", ")} onChange={(e) => patch(p.id, { weights: e.target.value.split(",").map(Number).filter((n) => n > 0) })}/></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Service charge %<input type="number" step=".01" className="mt-1 w-full rounded-xl border p-3 font-normal" value={p.serviceChargePercent} onChange={(e) => patch(p.id, { serviceChargePercent: Number(e.target.value) })}/></label><label className="text-sm font-bold">GST %<input type="number" step=".01" className="mt-1 w-full rounded-xl border p-3 font-normal" value={p.gstPercent} onChange={(e) => patch(p.id, { gstPercent: Number(e.target.value) })}/></label></div><button onClick={() => save(p)} className="rounded-xl bg-stone-900 px-5 py-3 font-bold text-white">Save Product</button></section>)}</div>{message && <p className="text-sm font-bold">{message}</p>}</main>;
}
