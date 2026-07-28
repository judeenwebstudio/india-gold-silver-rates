"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";

type Price = { metalValue: number; serviceCharge: number; gst: number; shipping: number; total: number };
type Product = { id: string; name: string; metalType: string; description: string; imageUrl: string | null; weights: number[]; serviceChargePercent: number; gstPercent: number; ratePerGram: number; prices: Record<string, Price> };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open(): void } } }
async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => { const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => resolve(); s.onerror = () => reject(new Error("Unable to load Razorpay.")); document.head.appendChild(s); });
}

function ProductImage({ product }: { product: Product }) {
  const fallback = product.metalType === "GOLD" ? "/products/gold-22k-coin.webp" : "/products/silver-coin.webp";
  const [src, setSrc] = useState(product.imageUrl || fallback);
  const [loaded, setLoaded] = useState(false);
  return <div className="p-3 sm:p-4">
    <div className="relative flex h-[240px] items-center justify-center overflow-hidden rounded-2xl border border-stone-100 bg-neutral-50 p-6 md:h-[320px] md:p-10">
      {!loaded && <div className="absolute inset-0 animate-pulse bg-stone-100" aria-label="Loading product image" />}
      <div className="premium-coin relative h-full w-full">
        <Image
          src={src}
          alt={product.name === "Gold 22K Coin" ? "Gold 22K Coin" : "Silver Coin"}
          fill
          sizes="(min-width: 768px) 40vw, 90vw"
          className="object-contain"
          onLoad={() => setLoaded(true)}
          onError={() => { if (src !== fallback) setSrc(fallback); else setLoaded(true); }}
          priority={product.metalType === "GOLD"}
        />
        <div className="coin-highlight pointer-events-none absolute inset-0 rounded-full" aria-hidden="true" />
      </div>
    </div>
  </div>;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [location, setLocation] = useState("Trichy");
  const [selections, setSelections] = useState<Record<string, { weight: number; quantity: number }>>({});
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/v1/shop", { cache: "no-store" }).then((r) => r.json()).then((body) => { if (!body.success) throw new Error(body.error?.message); setProducts(body.data.products); setLocation(body.data.location); setSelections(Object.fromEntries(body.data.products.map((p: Product) => [p.id, { weight: p.weights[0], quantity: 1 }]))); }).catch((e) => setError(e.message)); }, []);

  async function buy(product: Product) {
    if (busy) return;
    const token = localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
    if (!token) { setAuthOpen(true); return; }
    setBusy(product.id); setError("");
    try {
      const selection = selections[product.id];
      const response = await fetch("/api/v1/shop/checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId: product.id, weightGrams: selection.weight, quantity: selection.quantity }) });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error?.message || "Checkout failed.");
      const order = body.data;
      if (order.gateway === "PHONEPE") { if (!order.redirectUrl) throw new Error("PhonePe is unavailable."); window.location.assign(order.redirectUrl); return; }
      await loadRazorpay();
      new window.Razorpay!({
        key: order.keyId, order_id: order.gatewayOrderId, amount: Math.round(order.amount * 100), currency: order.currency,
        name: "RateStack Shop", description: `${product.name} — ${selection.weight}g`,
        handler: async (result: Record<string, string>) => {
          const verify = await fetch("/api/v1/shop/verify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shopOrderId: order.shopOrderId, gatewayPaymentId: result.razorpay_payment_id, gatewaySignature: result.razorpay_signature }) });
          const verified = await verify.json();
          if (!verify.ok || !verified.success) { setError(verified.error?.message || "Payment verification failed."); setBusy(""); return; }
          window.location.href = "/shop/orders?payment=success";
        },
        modal: { ondismiss: () => setBusy("") },
      }).open();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to start checkout."); setBusy(""); }
  }

  return <div className="min-h-screen bg-[#fbfaf7]"><Header/><main className="mx-auto max-w-6xl px-4 py-12"><section className="shop-hero mb-8 overflow-hidden rounded-3xl border border-amber-900/10 px-5 py-7 text-center shadow-[0_12px_32px_rgba(89,59,18,0.07)] md:px-10 md:py-8" aria-labelledby="shop-heading"><h1 id="shop-heading" className="font-display mx-auto max-w-4xl text-3xl font-bold leading-tight tracking-[-0.035em] text-stone-900 sm:text-4xl md:text-5xl">Buy Certified <span className="shop-hero-gold">Gold &amp; Silver Coins</span> at Live Trichy Rates</h1><div className="shop-hero-divider mx-auto my-4 h-px w-32 overflow-hidden rounded-full" aria-hidden="true"><span className="block h-full w-1/2"/></div><p className="mx-auto max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">Shop 22K Gold and Silver Coins at the same live {location === "Trichy" ? "Tiruchirappalli" : location} rate, wherever you are.</p></section>{error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 font-semibold text-red-800">{error}</p>}<div className="grid gap-8 md:grid-cols-2">{products.map((product) => { const selection = selections[product.id] || { weight: product.weights[0], quantity: 1 }; const unit = product.prices[String(selection.weight)]; const price = unit ? { metalValue: unit.metalValue * selection.quantity, serviceCharge: unit.serviceCharge * selection.quantity, gst: unit.gst * selection.quantity, shipping: unit.shipping * selection.quantity, total: unit.total * selection.quantity } : null; return <article key={product.id} className="shop-product-card overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-[0_14px_40px_rgba(41,34,24,0.10)]"><ProductImage product={product}/><div className="space-y-5 p-6"><div><h2 className="text-2xl font-black">{product.name}</h2><p className="mt-1 text-sm text-stone-600">{product.description}</p><p className="mt-3 rounded-lg bg-stone-100 p-2 text-sm font-bold">Live Trichy rate: ₹{product.ratePerGram.toLocaleString("en-IN")}/g</p></div><div className="grid grid-cols-2 gap-3"><label className="text-sm font-bold">Weight<select value={selection.weight} onChange={(e) => setSelections({ ...selections, [product.id]: { ...selection, weight: Number(e.target.value) } })} className="mt-1 w-full rounded-xl border p-3">{product.weights.map((w) => <option key={w} value={w}>{w >= 1000 ? `${w / 1000}kg` : `${w}g`}</option>)}</select></label><label className="text-sm font-bold">Quantity<input type="number" min="1" max="10" value={selection.quantity} onChange={(e) => setSelections({ ...selections, [product.id]: { ...selection, quantity: Math.max(1, Math.min(10, Number(e.target.value))) } })} className="mt-1 w-full rounded-xl border p-3"/></label></div>{price && <div className="space-y-2 rounded-2xl bg-stone-950 p-4 text-sm text-white"><div className="flex justify-between"><span>Metal Value</span><span>₹{price.metalValue.toLocaleString("en-IN")}</span></div><div className="flex justify-between"><span>Service Charge</span><span>₹{price.serviceCharge.toLocaleString("en-IN")}</span></div><div className="flex justify-between"><span>GST (3%)</span><span>₹{price.gst.toLocaleString("en-IN")}</span></div><div className="flex justify-between"><span>Shipping Cost</span><span className="font-black text-emerald-300">{price.shipping === 0 ? "FREE" : `₹${price.shipping.toLocaleString("en-IN")}`}</span></div><div className="flex justify-between border-t border-stone-700 pt-3 text-lg font-black text-amber-300"><span>Total Payable</span><span>₹{price.total.toLocaleString("en-IN")}</span></div></div>}<button onClick={() => buy(product)} disabled={Boolean(busy)} className="premium-buy-button flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-black text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-60" aria-busy={busy === product.id}>{busy === product.id ? <><span className="buy-spinner h-4 w-4 rounded-full border-2 border-stone-900/30 border-t-stone-900" aria-hidden="true"/><span>Preparing secure payment…</span></> : <><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.6L21 7H6"/></svg><span>Buy Now</span></>}</button></div></article>; })}</div></main><Footer/>{authOpen && <AuthModal initialMode="login" redirectTo="/shop" onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)}/>}</div>;
}
