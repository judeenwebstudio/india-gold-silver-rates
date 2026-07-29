"use client";

import { useEffect, useState } from "react";

type Row = { rank: number; city: string; citySlug: string; state: string; gold24kPerGram: number; gold22kPerGram: number; silverPerKg: number; rateDate: string; sourceName: string; rateType: string; stale: boolean };
type Data = { records: Row[]; pagination: { hasMore: boolean; totalRecords: number }; identicalRates: boolean; sourceSummary: { originalCount: number; indicativeCount: number }; states: { name: string; slug: string }[] };
const money = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function MajorCityRates() {
  const [metal, setMetal] = useState("gold22k"), [search, setSearch] = useState(""), [state, setState] = useState(""), [rateType, setRateType] = useState("ALL");
  const [page, setPage] = useState(1), [data, setData] = useState<Data | null>(null), [rows, setRows] = useState<Row[]>([]), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ metal, sort: "asc", page: String(page), pageSize: "12", rateType });
      if (search) query.set("search", search); if (state) query.set("state", state);
      fetch(`/api/v1/rates/cities?${query}`, { signal: controller.signal }).then(async (response) => ({ response, body: await response.json() })).then(({ response, body }) => {
        if (!response.ok) throw new Error(); setData(body.data);
        setRows((current) => page === 1 ? body.data.records : [...current, ...body.data.records.filter((next: Row) => !current.some((item) => item.citySlug === next.citySlug))]);
      }).catch((reason) => { if (reason.name !== "AbortError") setError("City comparison rates are temporarily unavailable."); });
    }, search ? 250 : 0);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [metal, search, state, rateType, page]);
  const reset = (setter: (value: string) => void, value: string) => { setter(value); setPage(1); };
  return (
    <section id="cities" className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div><p className="eyebrow">Across India</p><h2 className="section-title mt-2">Live Rates Across Indian Cities</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">City prices are indicative calculations from the national IBJA base and configured city adjustments. Identical values are not treated as independent original publications.</p></div>
        <div className="mt-7 grid gap-3 md:grid-cols-4">
          <select aria-label="Sort metal" value={metal} onChange={(e) => reset(setMetal, e.target.value)} className="rounded-xl border px-3 py-3"><option value="gold22k">Lowest 22K Gold</option><option value="gold24k">Lowest 24K Gold</option><option value="silver">Lowest Silver</option><option value="city">City name</option></select>
          <input aria-label="Search cities" value={search} onChange={(e) => reset(setSearch, e.target.value)} placeholder="Search all cities" className="rounded-xl border px-3 py-3" />
          <select aria-label="Filter by state" value={state} onChange={(e) => reset(setState, e.target.value)} className="rounded-xl border px-3 py-3"><option value="">All states</option>{data?.states.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
          <select aria-label="Filter by rate type" value={rateType} onChange={(e) => reset(setRateType, e.target.value)} className="rounded-xl border px-3 py-3"><option value="ALL">All rate types</option><option value="ORIGINAL">Original only</option><option value="INDICATIVE">Indicative only</option></select>
        </div>
        {data?.identicalRates && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Multiple cities currently have the same calculated rate. No city is labelled “lowest” when selected values are identical.</p>}
        <div className="mt-6 overflow-hidden rounded-2xl border" aria-live="polite">
          {error ? <p className="p-8 text-center">{error}</p> : rows.length === 0 ? <p className="p-8 text-center">No city rates match these filters.</p> : <>
            <table className="hidden w-full border-collapse text-left md:table"><thead className="bg-[#211d18] text-xs uppercase text-stone-300"><tr><th className="px-4 py-4">Rank</th><th className="px-4 py-4">City</th><th className="px-4 py-4">24K / g</th><th className="px-4 py-4">22K / g</th><th className="px-4 py-4">Silver / kg</th><th className="px-4 py-4">Provenance</th></tr></thead><tbody className="divide-y">{rows.map((row) => <tr key={row.citySlug}><td className="px-4 py-4 font-bold">{row.rank}</td><td className="px-4 py-4"><b>{row.city}</b><p className="text-xs text-stone-500">{row.state}</p></td><td className="px-4 py-4">{money(row.gold24kPerGram)}</td><td className="px-4 py-4">{money(row.gold22kPerGram)}</td><td className="px-4 py-4">{money(row.silverPerKg)}</td><td className="px-4 py-4 text-xs"><span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-800">Indicative calculated rate</span><p className="mt-2 text-stone-500">{row.sourceName} · {row.rateDate}{row.stale ? " · Stale" : ""}</p></td></tr>)}</tbody></table>
            <div className="divide-y md:hidden">{rows.map((row) => <article key={row.citySlug} className="p-5"><div className="flex justify-between"><div><b>{row.city}</b><p className="text-xs text-stone-500">{row.state}</p></div><b>#{row.rank}</b></div><p className="mt-3 text-sm">24K {money(row.gold24kPerGram)} · 22K {money(row.gold22kPerGram)}<br />Silver/kg {money(row.silverPerKg)} · Indicative</p></article>)}</div>
          </>}
        </div>
        {data && <div className="mt-5 flex items-center justify-between gap-3"><p className="text-sm text-stone-500">Showing {rows.length} of {data.pagination.totalRecords} · Original: {data.sourceSummary.originalCount} · Indicative: {data.sourceSummary.indicativeCount}</p><div className="flex gap-2">{page > 1 && <button onClick={() => setPage(1)} className="rounded-full border px-4 py-2 text-sm font-bold">Show less</button>}{data.pagination.hasMore && <button onClick={() => setPage((value) => value + 1)} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-bold text-white">Show more</button>}</div></div>}
      </div>
    </section>
  );
}
