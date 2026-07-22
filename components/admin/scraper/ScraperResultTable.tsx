import type { ScrapedRateResult } from "@/lib/scrapers/types";

function formatSourceValue(value: string) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatPerGram(value: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value));
}

export function ScraperResultTable({ result }: { result: ScrapedRateResult }) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" aria-labelledby="parsed-rates-title">
      <div className="flex flex-col justify-between gap-3 border-b border-stone-200 px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 id="parsed-rates-title" className="font-display text-xl font-bold text-stone-950">
            Parsed source rates
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            Source date {result.sourceDate} · {result.sourceTime} · {result.preferredSession} preferred
          </p>
        </div>
        <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-emerald-800">
          {result.quotes.length} values parsed
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
          <thead className="bg-stone-50 text-[0.65rem] font-black uppercase tracking-[0.12em] text-stone-500">
            <tr>
              <th className="px-5 py-3">Source purity</th>
              <th className="px-5 py-3">AM quote</th>
              <th className="px-5 py-3">PM quote</th>
              <th className="px-5 py-3">Selected / gram</th>
              <th className="px-5 py-3">Selected / kilogram</th>
              <th className="px-5 py-3">Database mapping</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {result.quotes.map((quote) => {
              const selected = result.preferredSession === "PM" ? quote.pm : quote.am;

              return (
                <tr key={quote.code} className="text-stone-700">
                  <td className="whitespace-nowrap px-5 py-4 font-bold text-stone-950">{quote.label}</td>
                  <td className="whitespace-nowrap px-5 py-4">₹{formatSourceValue(quote.am.sourceValue)}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {quote.pm ? `₹${formatSourceValue(quote.pm.sourceValue)}` : "Not published"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-stone-950">
                    {selected ? formatPerGram(selected.pricePerGram) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {selected?.pricePerKilogram
                      ? `₹${formatSourceValue(selected.pricePerKilogram)}`
                      : "Not applicable"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {quote.mappedPurity ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900">
                        {quote.mappedPurity.replace(/^K/, "").replace(/^P/, "")}
                        {quote.mappedPurity.startsWith("K") ? "K" : ""}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-stone-400">Parsed only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
