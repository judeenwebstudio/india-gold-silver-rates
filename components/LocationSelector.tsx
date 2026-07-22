"use client";

import { useMemo, useState } from "react";
import { citiesByState } from "@/lib/sample-data";

export function LocationSelector() {
  const states = Object.keys(citiesByState);
  const [state, setState] = useState("All India");
  const [city, setCity] = useState("New Delhi");
  const cities = useMemo(() => citiesByState[state] ?? [], [state]);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur sm:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Select state</span>
          <select
            value={state}
            onChange={(event) => {
              const nextState = event.target.value;
              setState(nextState);
              setCity(citiesByState[nextState][0]);
            }}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white outline-none transition focus:border-amber-300"
          >
            {states.map((item) => <option key={item} value={item} className="text-stone-900">{item}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Select city</span>
          <select value={city} onChange={(event) => setCity(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white outline-none transition focus:border-amber-300">
            {cities.map((item) => <option key={item} value={item} className="text-stone-900">{item}</option>)}
          </select>
        </label>
        <div className="flex h-12 items-center rounded-xl bg-amber-300 px-5 text-sm font-bold text-stone-950 md:min-w-52 md:justify-center">
          Showing: {city}
        </div>
      </div>
    </div>
  );
}
