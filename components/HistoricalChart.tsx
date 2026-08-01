"use client";

import { useEffect, useMemo, useState } from "react";

type Metal = "gold24k" | "gold22k" | "silver";
type Rate = { date: string; rate: number; sourcePublishedAt: string; sourceName: string; sourceSession: string };
type History = { city: string; providerName: string; records: Rate[]; availableDays: number; summary: null | { current: number; change: number; high: number; low: number } };
const money = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function HistoricalChart() {
  const [metal, setMetal] = useState<Metal>("gold22k");
  const [unit, setUnit] = useState("gram");
  const [data, setData] = useState<History | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/v1/rates/history?city=tiruchirappalli&days=7&metal=${metal}&unit=${metal === "silver" ? unit : "gram"}`, { signal: controller.signal })
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => { if (!response.ok) throw new Error(); setData(body.data); })
      .catch((reason) => { if (reason.name !== "AbortError") setError("Stored rate history is temporarily unavailable."); });
    return () => controller.abort();
  }, [metal, unit]);
  const points = useMemo(() => {
    if (!data?.records.length) return [];
    const values = data.records.map((item) => item.rate);
    const low = Math.min(...values), range = Math.max(...values) - low || 1;
    return data.records.map((item, index) => ({ ...item, x: data.records.length === 1 ? 50 : 5 + index / (data.records.length - 1) * 90, y: 86 - (item.rate - low) / range * 70 }));
  }, [data]);
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <section id="historical" className="border-y border-stone-200 bg-[#f3efe7] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="eyebrow">Real stored data</p><h2 className="section-title mt-2">7-Day Movement</h2><p className="mt-3 max-w-2xl text-sm text-stone-600">{data?.city ?? "Tiruchirappalli"} prices from stored {data?.providerName ?? "GoodReturns"} city publications. Missing dates are never estimated.</p></div>
          <div className="flex flex-wrap gap-2" aria-label="Historical chart controls">
            {(["gold24k", "gold22k", "silver"] as Metal[]).map((value) => <button key={value} onClick={() => setMetal(value)} className={`rounded-full px-4 py-2 text-sm font-bold ${metal === value ? "bg-stone-900 text-white" : "border border-stone-300 bg-white"}`}>{value === "gold24k" ? "24K Gold" : value === "gold22k" ? "22K Gold" : "Silver"}</button>)}
            {metal === "silver" && <select aria-label="Silver unit" value={unit} onChange={(event) => setUnit(event.target.value)} className="rounded-full border bg-white px-4 py-2"><option value="gram">Per gram</option><option value="kilogram">Per kg</option></select>}
          </div>
        </div>
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7" aria-live="polite">
          {error ? <p className="py-20 text-center">{error}</p> : !data ? <p className="py-20 text-center">Loading stored rates…</p> : !points.length ? <p className="py-20 text-center">No stored rate history is available for this selection. History will build as daily rates are collected.</p> : <>
            {data.availableDays < 2 ? <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">History will build as daily rates are collected.</p> : data.availableDays < 7 && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Showing {data.availableDays} available trading days; missing dates are not estimated.</p>}
            <div className="relative h-64"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible" role="img" aria-label={`${data.availableDays}-day price chart`}><polygon points={`5,92 ${line} 95,92`} fill="rgba(217,119,6,.12)" /><polyline points={line} fill="none" stroke="#b7791f" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />{points.map((point, index) => <circle key={point.date} cx={point.x} cy={point.y} r={active === index ? 2.2 : 1.4} fill="#7c4a03" tabIndex={0} role="button" aria-label={`${point.date}: ${money(point.rate)}`} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)} />)}</svg>{active != null && <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-lg bg-stone-900 px-3 py-2 text-xs text-white">{points[active].date} · {money(points[active].rate)} · {points[active].sourceSession}</div>}</div>
            <div className="grid gap-3 border-t pt-5 sm:grid-cols-4">{[["Current", data.summary!.current], ["Change", data.summary!.change], ["High", data.summary!.high], ["Low", data.summary!.low]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-stone-50 p-4"><p className="text-xs font-bold uppercase text-stone-500">{label}</p><p className="mt-1 font-display text-xl">{money(Number(value))}</p></div>)}</div>
            <p className="mt-4 text-xs text-stone-500">Source: {points.at(-1)!.sourceName} · Published {new Date(points.at(-1)!.sourcePublishedAt).toLocaleString("en-IN")} · Stored city publication</p>
          </>}
        </div>
      </div>
    </section>
  );
}
