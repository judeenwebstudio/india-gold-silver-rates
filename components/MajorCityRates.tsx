import type { MajorCityRate } from "@/lib/public-rate-types";

export function MajorCityRates({ cities }: { cities: MajorCityRate[] }) {
  return (
    <section id="cities" className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="eyebrow">Across India</p><h2 className="section-title mt-2">Rates in major cities</h2></div>
          <span className="w-fit rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-600">Calculated from national base rates</span>
        </div>
        <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="bg-[#211d18] text-xs uppercase tracking-wider text-stone-300"><tr><th className="px-5 py-4">City</th><th className="px-5 py-4">24K / gram</th><th className="px-5 py-4">22K / gram</th><th className="px-5 py-4">Silver / kg</th><th className="px-5 py-4">Rate type</th></tr></thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {cities.map((row) => <tr key={row.citySlug} className="transition-colors hover:bg-amber-50/60"><td className="px-5 py-4"><p className="font-bold text-stone-900">{row.city}</p><p className="mt-0.5 text-xs text-stone-500">{row.state}</p></td><td className="px-5 py-4 font-semibold text-stone-700">₹{row.gold24k.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td className="px-5 py-4 font-semibold text-stone-700">₹{row.gold22k.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td className="px-5 py-4 font-semibold text-stone-700">₹{row.silverKg.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td><td className="px-5 py-4"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">Indicative city rate</span></td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
