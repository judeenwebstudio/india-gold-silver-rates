"use client";

import { useState } from "react";
import { GoldCalculator } from "@/components/GoldCalculator";
import { LocationSelector } from "@/components/LocationSelector";
import { SilverWeightCalculator } from "@/components/SilverWeightCalculator";
import type { PublicRateSnapshot, PublicStateOption } from "@/lib/public-rate-types";

export function CalculatorExperience({ states, initialSnapshot }: { states: PublicStateOption[]; initialSnapshot: PublicRateSnapshot }) {
  const [snapshot,setSnapshot]=useState(initialSnapshot);
  const [stateId,setStateId]=useState(initialSnapshot.location.stateId ?? states[0]?.id ?? "");
  const [citySlug,setCitySlug]=useState(initialSnapshot.location.citySlug ?? "");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  async function selectCity(slug:string,nextStateId=stateId){
    if(!slug)return;setStateId(nextStateId);setCitySlug(slug);setLoading(true);setError("");
    try{const response=await fetch(`/api/rates/city/${encodeURIComponent(slug)}`,{cache:"no-store"});const data=await response.json() as PublicRateSnapshot|{error?:string};if(!response.ok||!("rates" in data))throw new Error("error" in data?data.error:"City rates could not be loaded.");setSnapshot(data)}catch(reason){setError(reason instanceof Error?reason.message:"City rates could not be loaded.")}finally{setLoading(false)}
  }
  function selectState(next:string){const city=states.find(state=>state.id===next)?.cities[0];setStateId(next);if(city)void selectCity(city.slug,next)}
  return <div className="space-y-8">
    <section className="rounded-3xl bg-stone-950 p-6 text-white sm:p-8"><p className="text-xs font-black uppercase tracking-[.18em] text-amber-300">Live city calculator</p><h1 className="mt-2 font-display text-4xl font-bold">Gold &amp; silver calculator</h1><p className="mt-3 text-stone-300">Select a city, then calculate instantly from its already-loaded per-gram rates.</p><div className="mt-6"><LocationSelector states={states} selectedStateId={stateId} selectedCitySlug={citySlug} loading={loading} onStateChange={selectState} onCityChange={slug=>void selectCity(slug)}/></div>{error&&<p role="alert" className="mt-3 rounded-xl bg-red-950/60 p-3 text-red-100">{error}</p>}</section>
    <div className="grid gap-8 lg:grid-cols-2"><GoldCalculator rates={snapshot.rates}/><SilverWeightCalculator snapshot={snapshot}/></div>
  </div>;
}
