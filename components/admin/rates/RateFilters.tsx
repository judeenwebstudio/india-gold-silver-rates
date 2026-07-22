import Link from "next/link";

import {
  METAL_MANAGEMENT,
  PURITY_LABELS,
  type ManagedMetalType,
  type RateLocationOption,
} from "@/lib/rate-management";

type RateFiltersProps = {
  metalType: ManagedMetalType;
  locations: RateLocationOption[];
  values: {
    query: string;
    stateId: string;
    cityId: string;
    purity: string;
  };
};

export function RateFilters({ metalType, locations, values }: RateFiltersProps) {
  const metal = METAL_MANAGEMENT[metalType];
  const inputClassName =
    "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-800 shadow-sm focus:border-amber-600 focus:ring-4 focus:ring-amber-100";

  return (
    <form action={metal.route} method="get" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] xl:items-end">
        <div>
          <label htmlFor={`${metalType.toLowerCase()}-rate-search`} className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-500">
            Search
          </label>
          <input
            id={`${metalType.toLowerCase()}-rate-search`}
            name="q"
            type="search"
            defaultValue={values.query}
            placeholder="City, state, source or purity"
            className={inputClassName}
          />
        </div>

        <div>
          <label htmlFor={`${metalType.toLowerCase()}-state-filter`} className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-500">
            State
          </label>
          <select id={`${metalType.toLowerCase()}-state-filter`} name="state" defaultValue={values.stateId} className={inputClassName}>
            <option value="">All states</option>
            {locations.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${metalType.toLowerCase()}-city-filter`} className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-500">
            City
          </label>
          <select id={`${metalType.toLowerCase()}-city-filter`} name="city" defaultValue={values.cityId} className={inputClassName}>
            <option value="">All cities</option>
            {locations.map((state) => (
              <optgroup key={state.id} label={state.name}>
                {state.cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${metalType.toLowerCase()}-purity-filter`} className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-500">
            Purity
          </label>
          <select id={`${metalType.toLowerCase()}-purity-filter`} name="purity" defaultValue={values.purity} className={inputClassName}>
            <option value="">All purities</option>
            {metal.purities.map((purity) => (
              <option key={purity} value={purity}>
                {PURITY_LABELS[purity]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-black text-white hover:bg-amber-800">
            Apply
          </button>
          <Link href={metal.route} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-600 hover:bg-stone-50">
            Clear
          </Link>
        </div>
      </div>
    </form>
  );
}
