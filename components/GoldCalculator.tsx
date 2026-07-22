"use client";

import { useState } from "react";

import type { DisplayRate } from "@/lib/public-rate-types";

export function GoldCalculator({ rates }: { rates: DisplayRate[] }) {
  const goldRates = rates.filter((rate) => rate.metal === "gold");
  const [rateId, setRateId] = useState<DisplayRate["id"]>("gold-22k");
  const [weight, setWeight] = useState(10);
  const selected = goldRates.find((rate) => rate.id === rateId) ?? goldRates[0];
  const estimate = (selected?.price ?? 0) * Math.max(weight || 0, 0);

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-[#201c18] shadow-2xl shadow-stone-900/10">
      <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
        <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Gold purity</span><select aria-label="Gold purity" value={rateId} onChange={(event) => setRateId(event.target.value as DisplayRate["id"])} className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white">{goldRates.map((rate) => <option key={rate.id} value={rate.id} className="text-stone-900">{rate.label}</option>)}</select></label>
        <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Weight (grams)</span><input aria-label="Weight in grams" type="number" min="0" step="0.1" value={weight} onChange={(event) => setWeight(Number(event.target.value))} className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white" /></label>
      </div>
      <div className="border-t border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-300">Estimated metal value</p><p className="mt-1 text-xs text-stone-500">Excludes making charges and GST</p></div><p className="font-display text-3xl text-white sm:text-4xl">₹{estimate.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p></div>
      </div>
    </div>
  );
}
