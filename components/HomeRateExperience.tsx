"use client";

import { useEffect, useRef, useState } from "react";

import { GoldCalculator } from "@/components/GoldCalculator";
import { LocationSelector } from "@/components/LocationSelector";
import { RateCard } from "@/components/RateCard";
import type { PublicRateSnapshot, PublicStateOption } from "@/lib/public-rate-types";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export function HomeRateExperience({ states, initialSnapshot }: { states: PublicStateOption[]; initialSnapshot: PublicRateSnapshot }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedStateId, setSelectedStateId] = useState(initialSnapshot.location.stateId ?? states[0]?.id ?? "");
  const [selectedCitySlug, setSelectedCitySlug] = useState(initialSnapshot.location.citySlug ?? states[0]?.cities[0]?.slug ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const initialLocation = useRef(true);
  const gold22k = snapshot.rates.find((rate) => rate.id === "gold-22k") ?? snapshot.rates[0];
  const silverGram = snapshot.rates.find((rate) => rate.id === "silver-gram") ?? snapshot.rates[0];

  useEffect(() => {
    if (initialLocation.current) {
      initialLocation.current = false;
      return;
    }

    window.dispatchEvent(
      new CustomEvent("analytics:city-view", {
        detail: {
          citySlug: snapshot.location.citySlug,
          cityName: snapshot.location.cityName,
          stateSlug: snapshot.location.stateSlug,
          stateName: snapshot.location.stateName,
        },
      }),
    );
  }, [
    snapshot.location.cityName,
    snapshot.location.citySlug,
    snapshot.location.stateName,
    snapshot.location.stateSlug,
  ]);

  async function selectCity(slug: string, stateId = selectedStateId) {
    if (!slug) return;
    setSelectedStateId(stateId);
    setSelectedCitySlug(slug);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/rates/city/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = await response.json() as PublicRateSnapshot | { error?: string };
      if (!response.ok || !("rates" in data)) throw new Error("error" in data ? data.error : "City rates could not be loaded.");
      setSnapshot(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "City rates could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  function handleStateChange(stateId: string) {
    const firstCity = states.find((state) => state.id === stateId)?.cities[0];
    setSelectedStateId(stateId);
    if (firstCity) void selectCity(firstCity.slug, stateId);
  }

  return (
    <>
      <section
        className="relative overflow-hidden bg-[#171411] text-white"
        data-analytics-location
        data-city-slug={snapshot.location.citySlug ?? undefined}
        data-city-name={snapshot.location.cityName}
        data-state-slug={snapshot.location.stateSlug ?? undefined}
        data-state-name={snapshot.location.stateName}
      >
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,#d99b2b_0,transparent_28%),radial-gradient(circle_at_85%_70%,#6b562d_0,transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div><p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Indicative city rate · {snapshot.location.cityName}</p><h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl lg:text-6xl">Gold &amp; silver rates,<span className="block text-amber-300">made clear for India.</span></h1><p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg">Current national bullion rates with transparent, purity-wise city adjustments—calculated when you select a location.</p><div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-400"><span>Last updated {formatTimestamp(snapshot.lastUpdatedAt)} IST</span><span className="hidden h-4 w-px bg-white/15 sm:block" /><span>Source: {snapshot.source} · source time {formatTimestamp(snapshot.sourceTimestamp)} IST</span></div></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">{[gold22k, silverGram].map((rate) => <div key={rate.id} className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/10 backdrop-blur"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-stone-300">{rate.shortLabel}</span><span className="rounded-full bg-amber-300/10 px-2 py-1 text-xs font-bold text-amber-200">Indicative</span></div><div className="mt-5 flex items-end justify-between gap-4"><p className="font-display text-3xl text-white">₹{rate.price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p><p className="pb-1 text-xs text-stone-400">{rate.unit}</p></div></div>)}</div>
          </div>
          <div className="mt-10 lg:mt-14"><LocationSelector states={states} selectedStateId={selectedStateId} selectedCitySlug={selectedCitySlug} loading={loading} onStateChange={handleStateChange} onCityChange={(slug) => void selectCity(slug)} /></div>
          {error && <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200" role="alert">{error} The previous rates remain visible.</p>}
        </div>
      </section>

      <section id="rates" className="bg-[#fbfaf7] py-14 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="eyebrow">{snapshot.location.cityName} market snapshot</p><h2 className="section-title mt-2">Indicative city rates</h2></div><p className="max-w-lg text-sm leading-6 text-stone-500 sm:text-right">National base rate plus the configured city adjustment. Making charges and GST are not included.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{snapshot.rates.map((rate, index) => <RateCard key={rate.id} rate={rate} featured={index === 0} />)}</div></div></section>

      <section id="calculator" className="bg-white py-14 sm:py-20"><div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-16 lg:px-8"><div><p className="eyebrow">Plan your purchase</p><h2 className="section-title mt-2">Gold price calculator</h2><p className="mt-4 max-w-xl text-base leading-7 text-stone-600">Estimate the metal value using the currently selected indicative city rate. Making charges and GST are intentionally excluded.</p></div><GoldCalculator rates={snapshot.rates} /></div></section>
    </>
  );
}
