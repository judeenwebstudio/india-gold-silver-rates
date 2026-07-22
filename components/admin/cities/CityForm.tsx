"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createCityAction, updateCityAction } from "@/app/admin/(workspace)/cities/actions";
import { CITY_ADJUSTMENT_FIELDS } from "@/lib/city-adjustments";
import type { CityActionState, CityStateOption, EditableCity } from "@/lib/city-management";

const INITIAL_STATE: CityActionState = { status: "idle", message: "" };

export function CityForm({ states, city, adjustmentLimit }: { states: CityStateOption[]; city?: EditableCity; adjustmentLimit: number }) {
  const [actionState, formAction, pending] = useActionState(
    city ? updateCityAction : createCityAction,
    INITIAL_STATE,
  );
  const fieldClassName = "h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 shadow-sm focus:border-amber-600 focus:ring-4 focus:ring-amber-100";
  const limit = adjustmentLimit;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="city-form-title">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">{city ? "Edit city" : "New city"}</p>
          <h2 id="city-form-title" className="mt-2 font-display text-2xl font-bold text-stone-950">
            {city ? `Edit ${city.name}` : "Add a city"}
          </h2>
          <p className="mt-2 text-sm text-stone-500">Adjustments are signed rupee amounts per gram. Allowed range: -₹{limit.toLocaleString("en-IN")} to +₹{limit.toLocaleString("en-IN")}.</p>
        </div>
        <Link href="/admin/cities" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-700 hover:bg-stone-50">Cancel</Link>
      </div>

      {actionState.status === "error" && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800" role="alert">{actionState.message}</div>
      )}

      <form action={formAction} className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {city && <input type="hidden" name="id" value={city.id} />}
        <div>
          <label htmlFor="city-name" className="mb-2 block text-sm font-bold text-stone-800">City name</label>
          <input id="city-name" name="name" defaultValue={city?.name ?? ""} maxLength={80} className={fieldClassName} required />
          {actionState.fieldErrors?.name && <p className="mt-1.5 text-xs font-semibold text-red-700">{actionState.fieldErrors.name}</p>}
        </div>
        <div>
          <label htmlFor="city-state" className="mb-2 block text-sm font-bold text-stone-800">State</label>
          <select id="city-state" name="stateId" defaultValue={city?.stateId ?? states[0]?.id} className={fieldClassName} required>
            {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
          </select>
          {actionState.fieldErrors?.stateId && <p className="mt-1.5 text-xs font-semibold text-red-700">{actionState.fieldErrors.stateId}</p>}
        </div>

        {CITY_ADJUSTMENT_FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`city-${field.key}`} className="mb-2 block text-sm font-bold text-stone-800">{field.label} adjustment (₹/g)</label>
            <input
              id={`city-${field.key}`}
              name={field.key}
              type="number"
              step="0.0001"
              min={-limit}
              max={limit}
              inputMode="decimal"
              defaultValue={city?.[field.key] ?? "0"}
              className={fieldClassName}
              required
            />
            {actionState.fieldErrors?.[field.key] && <p className="mt-1.5 text-xs font-semibold text-red-700">{actionState.fieldErrors[field.key]}</p>}
          </div>
        ))}

        <label className="flex min-h-11 items-center gap-3 self-end rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm font-bold text-stone-800">
          <input type="checkbox" name="isActive" defaultChecked={city?.isActive ?? true} className="h-4 w-4 accent-amber-700" />
          Active publicly
        </label>
        <div className="flex items-end sm:col-span-2 xl:col-span-4">
          <button type="submit" disabled={pending || states.length === 0} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-black text-white hover:bg-amber-800 disabled:cursor-wait disabled:bg-stone-300">
            {pending ? "Saving city…" : city ? "Save city changes" : "Add city"}
          </button>
        </div>
      </form>
    </section>
  );
}
