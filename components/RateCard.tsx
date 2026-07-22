import type { DisplayRate } from "@/lib/public-rate-types";

function formatCurrency(value: number) {
  return value.toLocaleString("en-IN", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function RateCard({ rate, featured = false }: { rate: DisplayRate; featured?: boolean }) {
  const isUp = rate.change !== null && rate.change >= 0;

  return (
    <article className={`relative overflow-hidden rounded-2xl border p-5 transition-transform hover:-translate-y-1 ${featured ? "border-amber-300 bg-[#241d13] text-white shadow-xl shadow-amber-950/10" : "border-stone-200 bg-white text-stone-900 shadow-sm"}`}>
      {featured && <span className="absolute right-0 top-0 rounded-bl-xl bg-amber-300 px-3 py-1.5 text-[0.62rem] font-extrabold uppercase tracking-wider text-stone-950">Benchmark</span>}
      <div className="flex items-start justify-between gap-3">
        <div><p className={`text-sm font-bold ${featured ? "text-amber-200" : "text-stone-800"}`}>{rate.label}</p><p className={`mt-1 text-xs ${featured ? "text-stone-400" : "text-stone-500"}`}>{rate.purity}</p></div>
        <span className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${rate.metal === "gold" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{rate.metal === "gold" ? "Au" : "Ag"}</span>
      </div>
      <p className="mt-8 font-display text-[1.75rem] leading-none tracking-tight">₹{formatCurrency(rate.price)}</p>
      <p className={`mt-2 text-xs ${featured ? "text-stone-400" : "text-stone-500"}`}>{rate.unit}</p>
      <div className={`mt-5 border-t pt-4 ${featured ? "border-white/10" : "border-stone-100"}`}>
        {rate.change === null || rate.changePercent === null ? (
          <p className={`text-xs font-semibold ${featured ? "text-stone-400" : "text-stone-500"}`}>Previous national rate unavailable</p>
        ) : (
          <p className={`text-xs font-bold ${isUp ? "text-emerald-600" : "text-rose-600"}`}>{isUp ? "↑" : "↓"} ₹{formatCurrency(Math.abs(rate.change))} ({Math.abs(rate.changePercent).toFixed(2)}%)</p>
        )}
        <p className={`mt-1 text-[0.68rem] ${featured ? "text-stone-500" : "text-stone-400"}`}>Base ₹{formatCurrency(rate.basePrice)} {rate.adjustment >= 0 ? "+" : "−"} ₹{formatCurrency(Math.abs(rate.adjustment))}</p>
      </div>
    </article>
  );
}
