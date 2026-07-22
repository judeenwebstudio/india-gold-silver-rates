"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";

import {
  createRateAction,
  updateRateAction,
} from "@/app/admin/(workspace)/rates/actions";
import {
  METAL_MANAGEMENT,
  PURITY_LABELS,
  type EditableRate,
  type ManagedMetalType,
  type RateActionState,
  type RateLocationOption,
} from "@/lib/rate-management";

type RateFormProps = {
  metalType: ManagedMetalType;
  locations: RateLocationOption[];
  defaultRecordedAt: string;
  initialRate?: EditableRate;
};

const INITIAL_STATE: RateActionState = {
  status: "idle",
  message: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1.5 text-xs font-semibold text-red-700">{message}</p>;
}

export function RateForm({
  metalType,
  locations,
  defaultRecordedAt,
  initialRate,
}: RateFormProps) {
  const action = initialRate ? updateRateAction : createRateAction;
  const [actionState, formAction, pending] = useActionState(action, INITIAL_STATE);
  const initialStateId = initialRate?.stateId ?? locations[0]?.id ?? "";
  const initialCityId =
    initialRate?.cityId ?? locations.find(({ id }) => id === initialStateId)?.cities[0]?.id ?? "";
  const [selectedStateId, setSelectedStateId] = useState(initialStateId);
  const [selectedCityId, setSelectedCityId] = useState(initialCityId);
  const metal = METAL_MANAGEMENT[metalType];
  const availableCities = useMemo(
    () => locations.find(({ id }) => id === selectedStateId)?.cities ?? [],
    [locations, selectedStateId],
  );

  function handleStateChange(nextStateId: string) {
    setSelectedStateId(nextStateId);
    setSelectedCityId(locations.find(({ id }) => id === nextStateId)?.cities[0]?.id ?? "");
  }

  const fieldClassName =
    "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 shadow-sm focus:border-amber-600 focus:ring-4 focus:ring-amber-100";

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="rate-form-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            {initialRate ? "Edit record" : "New record"}
          </p>
          <h2 id="rate-form-title" className="mt-2 font-display text-2xl font-bold tracking-tight text-stone-950">
            {initialRate ? `Edit ${metal.label.toLowerCase()} rate` : `Add ${metal.label.toLowerCase()} rate`}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Changes are validated on the server and recorded in Rate History.
          </p>
        </div>
        <Link
          href={metal.route}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-700 hover:border-stone-400 hover:bg-stone-50"
        >
          Cancel
        </Link>
      </div>

      {actionState.status === "error" && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">
          {actionState.message}
        </div>
      )}

      <form action={formAction} className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <input type="hidden" name="metalType" value={metalType} />
        {initialRate && <input type="hidden" name="id" value={initialRate.id} />}

        <div>
          <label htmlFor="rate-state" className="mb-2 block text-sm font-bold text-stone-800">
            State
          </label>
          <select
            id="rate-state"
            name="stateId"
            value={selectedStateId}
            onChange={(event) => handleStateChange(event.target.value)}
            className={fieldClassName}
            required
          >
            {locations.map((state) => (
              <option key={state.id} value={state.id}>
                {state.name}
              </option>
            ))}
          </select>
          <FieldError message={actionState.fieldErrors?.stateId} />
        </div>

        <div>
          <label htmlFor="rate-city" className="mb-2 block text-sm font-bold text-stone-800">
            City
          </label>
          <select
            id="rate-city"
            name="cityId"
            value={selectedCityId}
            onChange={(event) => setSelectedCityId(event.target.value)}
            className={fieldClassName}
            required
          >
            {availableCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <FieldError message={actionState.fieldErrors?.cityId} />
        </div>

        <div>
          <label htmlFor="rate-purity" className="mb-2 block text-sm font-bold text-stone-800">
            Purity
          </label>
          <select
            id="rate-purity"
            name="purity"
            defaultValue={initialRate?.purity ?? metal.purities[0]}
            className={fieldClassName}
            required
          >
            {metal.purities.map((purity) => (
              <option key={purity} value={purity}>
                {PURITY_LABELS[purity]}
              </option>
            ))}
          </select>
          <FieldError message={actionState.fieldErrors?.purity} />
        </div>

        <div>
          <label htmlFor="rate-recorded-at" className="mb-2 block text-sm font-bold text-stone-800">
            Rate date &amp; time
          </label>
          <input
            id="rate-recorded-at"
            name="recordedAt"
            type="datetime-local"
            defaultValue={initialRate?.recordedAt ?? defaultRecordedAt}
            className={fieldClassName}
            required
          />
          <FieldError message={actionState.fieldErrors?.recordedAt} />
        </div>

        <div>
          <label htmlFor="rate-price-gram" className="mb-2 block text-sm font-bold text-stone-800">
            Price per gram (₹)
          </label>
          <input
            id="rate-price-gram"
            name="pricePerGram"
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            inputMode="decimal"
            defaultValue={initialRate?.pricePerGram ?? ""}
            placeholder={metalType === "GOLD" ? "10470.00" : "122.40"}
            className={fieldClassName}
            required
          />
          <FieldError message={actionState.fieldErrors?.pricePerGram} />
        </div>

        <div>
          <label htmlFor="rate-price-kilogram" className="mb-2 block text-sm font-bold text-stone-800">
            Price per kilogram (₹)
            {metalType === "GOLD" && <span className="ml-1 font-medium text-stone-400">Optional</span>}
          </label>
          <input
            id="rate-price-kilogram"
            name="pricePerKilogram"
            type="number"
            min="0.01"
            max="9999999999.99"
            step="0.01"
            inputMode="decimal"
            defaultValue={initialRate?.pricePerKilogram ?? ""}
            placeholder={metalType === "SILVER" ? "122400.00" : "Optional"}
            className={fieldClassName}
            required={metalType === "SILVER"}
          />
          <FieldError message={actionState.fieldErrors?.pricePerKilogram} />
        </div>

        <div className="flex items-end sm:col-span-2">
          <button
            type="submit"
            disabled={pending || locations.length === 0}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-black text-white shadow-sm transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 sm:w-auto"
          >
            {pending ? "Saving rate…" : initialRate ? "Save changes" : `Add ${metal.label.toLowerCase()} rate`}
          </button>
        </div>
      </form>
    </section>
  );
}
