"use client";

import { useEffect, useState } from "react";
import type { PublicRateSnapshot } from "@/lib/public-rate-types";
import { DEFAULT_SILVER_WEIGHT_GRAMS, formatPaise, formatSilverWeight, SILVER_WEIGHT_OPTIONS, SILVER_WEIGHT_STORAGE_KEY, silverValuePaise } from "@/lib/silver-rate-calculation";

export function SilverWeightCalculator({ snapshot }: { snapshot: PublicRateSnapshot }) {
  const [weight, setWeight] = useState(DEFAULT_SILVER_WEIGHT_GRAMS);
  const silver = snapshot.rates.find(rate => rate.id === "silver-gram");
  useEffect(() => {
    const saved = Number(localStorage.getItem(SILVER_WEIGHT_STORAGE_KEY));
    if (!SILVER_WEIGHT_OPTIONS.includes(saved as (typeof SILVER_WEIGHT_OPTIONS)[number])) return;
    const timer = window.setTimeout(() => setWeight(saved), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const select = (grams:number) => { setWeight(grams); localStorage.setItem(SILVER_WEIGHT_STORAGE_KEY, String(grams)); };
  const value = silver ? silverValuePaise(silver.price, weight) : null;
  const updated = silver?.fetchedAt || snapshot.sourceTimestamp;
  return <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-xl shadow-slate-900/5 sm:p-7">
    <div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">Silver 999 calculator</p><h3 className="mt-1 text-2xl font-black text-stone-950">{formatSilverWeight(weight)} silver value</h3></div><p className="text-sm text-stone-600">{snapshot.location.cityName}</p></div>
    {!silver || !Number.isFinite(silver.price) || silver.price <= 0 ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 font-semibold text-red-800">Silver rate is currently unavailable.</p> : <>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Silver weight">{SILVER_WEIGHT_OPTIONS.map(grams => <button type="button" key={grams} aria-pressed={weight===grams} onClick={()=>select(grams)} className={`rounded-full border px-3 py-2 text-sm font-bold transition ${weight===grams?"border-stone-950 bg-stone-950 text-white":"border-slate-300 bg-white text-stone-700 hover:border-amber-500"}`}>{formatSilverWeight(grams).replace(" ", "")}</button>)}</div>
      <div className="mt-6 grid gap-4 rounded-2xl bg-stone-950 p-5 text-white sm:grid-cols-3"><div><p className="text-xs text-stone-400">Selected weight</p><p className="mt-1 font-bold">{formatSilverWeight(weight)}</p></div><div><p className="text-xs text-stone-400">Price per gram</p><p className="mt-1 font-bold">{formatPaise(silverValuePaise(silver.price,1)!)}</p></div><div><p className="text-xs text-stone-400">Calculated silver value</p><p className="mt-1 text-xl font-black text-amber-300">{value===null?"Unavailable":formatPaise(value)}</p></div></div>
      <p className="mt-3 text-xs text-stone-500">Source updated {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"}).format(new Date(updated))} IST. Weight changes calculate instantly without another request.</p>
    </>}
  </div>;
}
