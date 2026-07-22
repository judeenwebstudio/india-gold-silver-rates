import { historicalRates } from "@/lib/sample-data";

export function HistoricalChart() {
  const min = Math.min(...historicalRates.map((item) => item.value));
  const max = Math.max(...historicalRates.map((item) => item.value));

  return (
    <section id="historical" className="border-y border-stone-200 bg-[#f3efe7] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-14">
          <div className="min-w-0">
            <p className="eyebrow">7-day movement</p>
            <h2 className="section-title mt-2">See the trend, not just today</h2>
            <p className="mt-4 text-base leading-7 text-stone-600">A full interactive historical chart will arrive with the live-data stage. This preview shows how recent 24K movement will be presented.</p>
            <div className="mt-6 flex gap-6">
              <div><p className="text-xs text-stone-500">7-day high</p><p className="mt-1 font-display text-xl">₹{max.toLocaleString("en-IN")}</p></div>
              <div><p className="text-xs text-stone-500">7-day low</p><p className="mt-1 font-display text-xl">₹{min.toLocaleString("en-IN")}</p></div>
            </div>
          </div>
          <div className="soft-grid min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex h-56 items-end justify-between gap-2 sm:gap-4">
              {historicalRates.map((item) => {
                const height = 32 + ((item.value - min) / (max - min)) * 58;
                return (
                  <div key={item.day} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                    <span className="mb-2 hidden rounded bg-stone-900 px-2 py-1 text-[0.62rem] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100 sm:block">₹{item.value.toLocaleString("en-IN")}</span>
                    <div className={`w-full max-w-10 rounded-t-lg ${item.day === "Today" ? "bg-amber-500" : "bg-stone-300"}`} style={{ height: `${height}%` }} />
                    <span className="mt-3 text-[0.62rem] font-semibold text-stone-500 sm:text-xs">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
