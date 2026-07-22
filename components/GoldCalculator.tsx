"use client";

import { useMemo, useState } from "react";

const rateByPurity: Record<string, number> = { "24K": 10470, "22K": 9598, "18K": 7853 };

export function GoldCalculator() {
  const [purity, setPurity] = useState("22K");
  const [weight, setWeight] = useState(10);
  const [makingCharge, setMakingCharge] = useState(8);

  const estimate = useMemo(() => {
    const goldValue = rateByPurity[purity] * Math.max(weight || 0, 0);
    const making = goldValue * (Math.max(makingCharge || 0, 0) / 100);
    const gst = (goldValue + making) * 0.03;
    return { goldValue, making, gst, total: goldValue + making + gst };
  }, [purity, weight, makingCharge]);

  const money = (value: number) => value.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div className="overflow-hidden rounded-3xl border border-stone-200 bg-[#201c18] shadow-2xl shadow-stone-900/10">
      <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-7">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Gold purity</span>
          <select value={purity} onChange={(event) => setPurity(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white">
            {Object.keys(rateByPurity).map((item) => <option key={item} className="text-stone-900">{item}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Weight (grams)</span>
          <input type="number" min="0" step="0.1" value={weight} onChange={(event) => setWeight(Number(event.target.value))} className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white" />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Making charge %</span>
          <input type="number" min="0" step="0.5" value={makingCharge} onChange={(event) => setMakingCharge(Number(event.target.value))} className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-semibold text-white" />
        </label>
      </div>
      <div className="border-t border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-stone-400"><span>Gold value</span><span className="font-semibold text-stone-200">₹{money(estimate.goldValue)}</span></div>
          <div className="flex justify-between text-stone-400"><span>Making charges</span><span className="font-semibold text-stone-200">₹{money(estimate.making)}</span></div>
          <div className="flex justify-between text-stone-400"><span>GST (3%)</span><span className="font-semibold text-stone-200">₹{money(estimate.gst)}</span></div>
        </div>
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-dashed border-white/15 pt-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Estimated total</p>
            <p className="mt-1 text-xs text-stone-500">For {weight || 0}g of {purity} gold</p>
          </div>
          <p className="font-display text-3xl text-white sm:text-4xl">₹{money(estimate.total)}</p>
        </div>
      </div>
    </div>
  );
}
