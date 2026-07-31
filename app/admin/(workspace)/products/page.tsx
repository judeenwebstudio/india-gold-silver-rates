"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type Product = { id: string; name: string; metalType: string; description: string; imageUrl: string | null; weights: number[]; serviceChargePercent: number; gstPercent: number; isActive: boolean;productCost:number|null;metalAcquisitionCost:number|null;packagingCost:number|null;shippingCost:number|null;gatewayFeePercent:number|null;otherCost:number|null };
export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState("");
  useEffect(() => { fetch("/api/v1/admin/products").then((r) => r.json()).then((d) => setProducts(d.products || [])); }, []);
  function patch(id: string, changes: Partial<Product>) { setProducts((all) => all.map((p) => p.id === id ? { ...p, ...changes } : p)); }
  async function save(product: Product) {
    setMessage("Saving…");
    const res = await fetch("/api/v1/admin/products", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(product) });
    setMessage(res.ok ? `${product.name} updated.` : "Unable to update product.");
  }
  async function upload(product: Product, file?: File) {
    if (!file) return;
    setUploading(product.id); setMessage("");
    const form = new FormData(); form.set("productId", product.id); form.set("image", file);
    const res = await fetch("/api/v1/admin/products/image", { method: "POST", body: form });
    const data = await res.json();
    if (res.ok) { patch(product.id, { imageUrl: data.imageUrl }); setMessage(`${product.name} image replaced.`); }
    else setMessage(data.error || "Image upload failed.");
    setUploading("");
  }
  async function removeImage(product: Product) {
    const res = await fetch(`/api/v1/admin/products/image?productId=${encodeURIComponent(product.id)}`, { method: "DELETE" });
    if (res.ok) { patch(product.id, { imageUrl: null }); setMessage(`${product.name} now uses its bundled default image.`); }
    else setMessage("Unable to remove image.");
  }
  return <main className="space-y-6"><div><h1 className="text-2xl font-black">Shop Products</h1><p className="text-sm text-stone-600">Manage the two customer-visible direct-purchase products.</p></div><div className="grid gap-5 lg:grid-cols-2">{products.map((p) => { const fallback = p.metalType === "GOLD" ? "/products/gold-22k-coin.webp" : "/products/silver-coin.webp"; return <section key={p.id} className="space-y-4 rounded-2xl border bg-white p-5"><div className="flex justify-between"><h2 className="text-lg font-bold">{p.name}</h2><label className="text-sm"><input type="checkbox" checked={p.isActive} onChange={(e) => patch(p.id, { isActive: e.target.checked })}/> Enabled</label></div><div className="relative aspect-square overflow-hidden rounded-2xl border bg-stone-100"><Image src={p.imageUrl || fallback} alt={`${p.name} preview`} fill sizes="480px" className="object-contain p-3" unoptimized={Boolean(p.imageUrl?.startsWith("/api/"))}/></div><div className="flex flex-wrap gap-2"><label className="cursor-pointer rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950">{uploading === p.id ? "Uploading…" : "Upload / Replace Image"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading === p.id} onChange={(e) => upload(p, e.target.files?.[0])}/></label><button type="button" onClick={() => removeImage(p)} className="rounded-xl border px-4 py-2 text-sm font-bold">Remove Image</button></div><p className="text-xs text-stone-500">JPG, JPEG, PNG or WebP, maximum 5 MB. Removal restores the bundled default.</p><label className="block text-sm font-bold">Description<textarea className="mt-1 w-full rounded-xl border p-3 font-normal" value={p.description} onChange={(e) => patch(p.id, { description: e.target.value })}/></label><label className="block text-sm font-bold">RateStack-hosted image path<input className="mt-1 w-full rounded-xl border p-3 font-normal" placeholder="/products/example.webp" value={p.imageUrl || ""} onChange={(e) => patch(p.id, { imageUrl: e.target.value || null })}/></label><label className="block text-sm font-bold">Available weights (grams)<input className="mt-1 w-full rounded-xl border p-3 font-normal" value={p.weights.join(", ")} onChange={(e) => patch(p.id, { weights: e.target.value.split(",").map(Number).filter((n) => n > 0) })}/></label><div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Service charge %<input type="number" step=".01" className="mt-1 w-full rounded-xl border p-3 font-normal" value={p.serviceChargePercent} onChange={(e) => patch(p.id, { serviceChargePercent: Number(e.target.value) })}/></label><label className="text-sm font-bold">GST %<input type="number" step=".01" className="mt-1 w-full rounded-xl border p-3 font-normal" value={p.gstPercent} onChange={(e) => patch(p.id, { gstPercent: Number(e.target.value) })}/></label></div><button onClick={() => save(p)} className="rounded-xl bg-stone-900 px-5 py-3 font-bold text-white">Save Product</button></section>; })}</div>{message && <p className="text-sm font-bold">{message}</p>}</main>;
}
