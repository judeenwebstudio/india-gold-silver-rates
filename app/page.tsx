import { Footer } from "@/components/Footer";
import { GoldCalculator } from "@/components/GoldCalculator";
import { HallmarkSection } from "@/components/HallmarkSection";
import { Header } from "@/components/Header";
import { HistoricalChart } from "@/components/HistoricalChart";
import { LocationSelector } from "@/components/LocationSelector";
import { MajorCityRates } from "@/components/MajorCityRates";
import { NewsSection } from "@/components/NewsSection";
import { RateCard } from "@/components/RateCard";
import { lastUpdated, sampleRates } from "@/lib/sample-data";

export default function Home() {
  const gold24k = sampleRates[0];
  const silverGram = sampleRates[3];

  return (
    <>
      <Header />
      <main>
        <section className="hero-surface relative overflow-hidden border-b border-amber-200/60">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full border border-amber-300/20" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full border border-amber-300/30" />
          <div className="mx-auto max-w-7xl px-4 pb-14 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pt-20">
            <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.15)]" />
                  Today&apos;s indicative rates
                </div>
                <h1 className="max-w-3xl font-display text-4xl leading-[1.08] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                  Gold &amp; silver rates,
                  <span className="block text-amber-300">made clear for India.</span>
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">
                  Check sample bullion prices by purity, compare daily movement,
                  and estimate your gold purchase—all in one dependable place.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-400">
                  <span className="flex items-center gap-2">
                    <span className="text-amber-300">●</span> Last updated {lastUpdated}
                  </span>
                  <span className="hidden h-4 w-px bg-white/15 sm:block" />
                  <span>Prices are sample data for this preview</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {[gold24k, silverGram].map((rate) => (
                  <div
                    key={rate.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/10 backdrop-blur"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-300">{rate.shortLabel}</span>
                      <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-bold text-emerald-300">
                        ↑ {rate.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-4">
                      <p className="font-display text-3xl text-white">₹{rate.price.toLocaleString("en-IN")}</p>
                      <p className="pb-1 text-xs text-stone-400">{rate.unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 lg:mt-14">
              <LocationSelector />
            </div>
          </div>
        </section>

        <section id="rates" className="bg-[#fbfaf7] py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Market snapshot</p>
                <h2 className="section-title mt-2">Today&apos;s rates at a glance</h2>
              </div>
              <p className="max-w-lg text-sm leading-6 text-stone-500 sm:text-right">
                Indicative retail rates before local taxes, making charges, and dealer premiums.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {sampleRates.map((rate, index) => (
                <RateCard key={rate.id} rate={rate} featured={index === 0} />
              ))}
            </div>
          </div>
        </section>

        <section id="calculator" className="bg-white py-14 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16 lg:px-8">
            <div>
              <p className="eyebrow">Plan your purchase</p>
              <h2 className="section-title mt-2">Gold price calculator</h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
                Get a quick estimate based on purity, weight, making charges, and GST.
                This is a planning tool—not a jeweller&apos;s final quote.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {[
                  ["01", "Choose purity"],
                  ["02", "Enter weight"],
                  ["03", "See estimate"],
                ].map(([number, label]) => (
                  <div key={number} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <span className="text-xs font-bold tracking-wider text-amber-700">{number}</span>
                    <p className="mt-2 text-sm font-semibold text-stone-800">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <GoldCalculator />
          </div>
        </section>

        <HistoricalChart />
        <MajorCityRates />
        <NewsSection />
        <HallmarkSection />
      </main>
      <Footer />
    </>
  );
}
