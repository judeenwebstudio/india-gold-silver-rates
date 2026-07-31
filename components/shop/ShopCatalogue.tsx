"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { LocationSelector } from "@/components/LocationSelector";
import { SilverWeightCalculator } from "@/components/SilverWeightCalculator";
import type { PublicRateSnapshot, PublicStateOption } from "@/lib/public-rate-types";

type Price = { metalValue: number; serviceCharge: number; gst: number; shipping: number; total: number };
type Product = {
  id: string; name: string; metalType: string; purity: string; description: string;
  imageUrl: string | null; weights: number[]; enabled: boolean; ratePerGram: number;
  prices: Record<string, Price>;
};

function ProductImage({ product }: { product: Product }) {
  const fallback = product.metalType === "GOLD" ? "/products/gold-22k-coin.webp" : "/products/silver-coin.webp";
  const [src, setSrc] = useState(product.imageUrl || fallback);
  const [loaded, setLoaded] = useState(false);
  return <div className="p-3 sm:p-4"><div className="relative flex h-[240px] items-center justify-center overflow-hidden rounded-2xl border border-stone-100 bg-neutral-50 p-6 md:h-[320px] md:p-10">
    {!loaded && <div className="absolute inset-0 animate-pulse bg-stone-100" aria-label="Loading product image" />}
    <div className="premium-coin relative h-full w-full">
      <Image src={src} alt={product.name} fill sizes="(min-width: 768px) 40vw, 90vw" className="object-contain" onLoad={() => setLoaded(true)} onError={() => { if (src !== fallback) setSrc(fallback); else setLoaded(true); }} priority={product.metalType === "GOLD"} />
      <div className="coin-highlight pointer-events-none absolute inset-0 rounded-full" aria-hidden="true" />
    </div>
  </div></div>;
}

export function ShopCatalogue({ embedded = false, states, initialSnapshot }: { embedded?: boolean; states?: PublicStateOption[]; initialSnapshot?: PublicRateSnapshot }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [location, setLocation] = useState("Loading shop location…");
  const [selections, setSelections] = useState<Record<string, { weight: number; quantity: number }>>({});
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [rateSnapshot,setRateSnapshot]=useState(initialSnapshot);
  const [rateStateId,setRateStateId]=useState(initialSnapshot?.location.stateId??states?.[0]?.id??"");
  const [rateCitySlug,setRateCitySlug]=useState(initialSnapshot?.location.citySlug??"");
  const [rateLoading,setRateLoading]=useState(false);

  async function selectRateCity(slug:string,nextStateId=rateStateId){if(!slug)return;setRateStateId(nextStateId);setRateCitySlug(slug);setRateLoading(true);try{const response=await fetch(`/api/rates/city/${encodeURIComponent(slug)}`,{cache:"no-store"});const data=await response.json() as PublicRateSnapshot|{error?:string};if(!response.ok||!("rates" in data))throw new Error("error" in data?data.error:"City rates could not be loaded.");setRateSnapshot(data)}catch(reason){setError(reason instanceof Error?reason.message:"City rates could not be loaded.")}finally{setRateLoading(false)}}

  useEffect(() => {
    fetch("/api/v1/shop", { cache: "no-store" }).then((response) => response.json()).then((body) => {
      if (!body.success) throw new Error(body.error?.message);
      setProducts(body.data.products);
      setLocation(body.data.location);
      setSelections(Object.fromEntries(body.data.products.map((product: Product) => [product.id, { weight: product.weights[0], quantity: 1 }])));
    }).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Shop is temporarily unavailable."));
  }, []);

  function buy(product: Product) {
    if (busy) return;
    const token = localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
    if (!token) { setAuthOpen(true); return; }
    const selection = selections[product.id];
    if (!selection) return;
    setBusy(product.id);
    window.location.assign(`/shop/checkout?productId=${encodeURIComponent(product.id)}&weight=${selection.weight}&quantity=${selection.quantity}`);
  }

  return <section id={embedded ? "shop-catalogue" : undefined} className={embedded ? "bg-[#fbfaf7] py-14 sm:py-20" : undefined} aria-labelledby={embedded ? "home-shop-heading" : "shop-heading"}>
    <div className={embedded ? "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8" : undefined}>
      <section className="shop-hero mb-8 overflow-hidden rounded-3xl border border-amber-900/10 px-5 py-7 text-center shadow-[0_12px_32px_rgba(89,59,18,0.07)] md:px-10 md:py-8">
        <h1 id={embedded ? "home-shop-heading" : "shop-heading"} className="font-display mx-auto max-w-4xl text-3xl font-bold leading-tight tracking-[-0.035em] text-stone-900 sm:text-4xl md:text-5xl">Buy Certified <span className="shop-hero-gold">Gold &amp; Silver Coins</span> at Live Rates</h1>
        <div className="shop-hero-divider mx-auto my-4 h-px w-32 overflow-hidden rounded-full" aria-hidden="true"><span className="block h-full w-1/2" /></div>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">Shop pricing location: {location}. Select a city below for the informational silver calculator.</p>
      </section>
      {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 font-semibold text-red-800">{error}</p>}
      <div className="grid gap-8 md:grid-cols-2">{products.map((product) => {
        const selection = selections[product.id] || { weight: product.weights[0], quantity: 1 };
        const unit = product.prices[String(selection.weight)];
        const price = unit ? { metalValue: unit.metalValue * selection.quantity, serviceCharge: unit.serviceCharge * selection.quantity, gst: unit.gst * selection.quantity, shipping: unit.shipping * selection.quantity, total: unit.total * selection.quantity } : null;
        return <article key={product.id} className="shop-product-card overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-[0_14px_40px_rgba(41,34,24,0.10)]">
          <ProductImage product={product} />
          <div className="space-y-5 p-6">
            <div><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-black">{product.name}</h2><p className="mt-1 text-sm text-stone-600">{product.description}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{product.enabled ? "In stock" : "Out of stock"}</span></div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-stone-700"><span className="rounded-full bg-stone-100 px-3 py-1">Purity: {product.purity}</span><span className="rounded-full bg-stone-100 px-3 py-1">Weight: {selection.weight}g</span></div>
              <p className="mt-3 rounded-lg bg-stone-100 p-2 text-sm font-bold">Shop rate: ₹{product.ratePerGram.toLocaleString("en-IN")}/g · {location}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-bold">Weight<select value={selection.weight} onChange={(event) => setSelections({ ...selections, [product.id]: { ...selection, weight: Number(event.target.value) } })} className="mt-1 w-full rounded-xl border p-3">{product.weights.map((weight) => <option key={weight} value={weight}>{weight >= 1000 ? `${weight / 1000}kg` : `${weight}g`}</option>)}</select></label>
              <label className="text-sm font-bold">Quantity<input type="number" min="1" max="10" value={selection.quantity} onChange={(event) => setSelections({ ...selections, [product.id]: { ...selection, quantity: Math.max(1, Math.min(10, Number(event.target.value))) } })} className="mt-1 w-full rounded-xl border p-3" /></label>
            </div>
            {price && <div className="space-y-2 rounded-2xl bg-stone-950 p-4 text-sm text-white">
              <div className="flex justify-between"><span>Metal Value</span><span>₹{price.metalValue.toLocaleString("en-IN")}</span></div><div className="flex justify-between"><span>Service Charge</span><span>₹{price.serviceCharge.toLocaleString("en-IN")}</span></div><div className="flex justify-between"><span>GST (3%)</span><span>₹{price.gst.toLocaleString("en-IN")}</span></div><div className="flex justify-between"><span>Shipping Cost</span><span className="font-black text-emerald-300">{price.shipping === 0 ? "FREE" : `₹${price.shipping.toLocaleString("en-IN")}`}</span></div><div className="flex justify-between border-t border-stone-700 pt-3 text-lg font-black text-amber-300"><span>Total Payable</span><span>₹{price.total.toLocaleString("en-IN")}</span></div>
            </div>}
            <button onClick={() => buy(product)} disabled={Boolean(busy) || !product.enabled} className="premium-buy-button flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-black text-stone-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-60" aria-busy={busy === product.id}>{busy === product.id ? "Opening checkout…" : "Buy Now"}</button>
          </div>
        </article>;
      })}</div>
      {states&&rateSnapshot&&<section className="mt-10 space-y-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><div><p className="text-xs font-black uppercase tracking-[.16em] text-amber-700">City silver rate display</p><h2 className="mt-1 text-2xl font-black">Calculate silver from 1g to 1kg</h2><p className="mt-2 text-sm text-stone-600">This informational city-rate calculator is separate from the available coin product denominations.</p></div><LocationSelector states={states} selectedStateId={rateStateId} selectedCitySlug={rateCitySlug} loading={rateLoading} onStateChange={next=>{const city=states.find(state=>state.id===next)?.cities[0];setRateStateId(next);if(city)void selectRateCity(city.slug,next)}} onCityChange={slug=>void selectRateCity(slug)}/><SilverWeightCalculator snapshot={rateSnapshot}/></section>}
    </div>
    {authOpen && <AuthModal initialMode="login" redirectTo="/shop" onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} />}
  </section>;
}
