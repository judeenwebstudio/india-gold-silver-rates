"use client";

import type { PublicStateOption } from "@/lib/public-rate-types";

type LocationSelectorProps = {
  states: PublicStateOption[];
  selectedStateId: string;
  selectedCitySlug: string;
  loading: boolean;
  onStateChange: (stateId: string) => void;
  onCityChange: (citySlug: string) => void;
};

export function LocationSelector({
  states,
  selectedStateId,
  selectedCitySlug,
  loading,
  onStateChange,
  onCityChange,
}: LocationSelectorProps) {
  const cities = states.find((state) => state.id === selectedStateId)?.cities ?? [];
  const cityName = cities.find((city) => city.slug === selectedCitySlug)?.name ?? "Select a city";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur sm:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Select state</span>
          <select
            aria-label="Select state"
            value={selectedStateId}
            onChange={(event) => onStateChange(event.target.value)}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white outline-none transition focus:border-amber-300"
          >
            {states.map((state) => <option key={state.id} value={state.id} className="text-stone-900">{state.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-400">Select city</span>
          <select
            aria-label="Select city"
            value={selectedCitySlug}
            onChange={(event) => onCityChange(event.target.value)}
            disabled={loading || cities.length === 0}
            className="h-12 w-full rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-semibold text-white outline-none transition focus:border-amber-300 disabled:opacity-60"
          >
            {cities.map((city) => <option key={city.id} value={city.slug} className="text-stone-900">{city.name}</option>)}
          </select>
        </label>
        <div className="flex h-12 items-center rounded-xl bg-amber-300 px-5 text-sm font-bold text-stone-950 md:min-w-52 md:justify-center" aria-live="polite">
          {loading ? "Updating rates…" : `Showing: ${cityName}`}
        </div>
      </div>
    </div>
  );
}
