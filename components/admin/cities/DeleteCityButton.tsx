"use client";

import { useActionState } from "react";

import { softDeleteCityAction } from "@/app/admin/(workspace)/cities/actions";
import type { CityActionState } from "@/lib/city-management";

const INITIAL_STATE: CityActionState = { status: "idle", message: "" };

export function DeleteCityButton({ cityId, cityName }: { cityId: string; cityName: string }) {
  const [state, formAction, pending] = useActionState(softDeleteCityAction, INITIAL_STATE);

  return (
    <form action={formAction} onSubmit={(event) => {
      if (!window.confirm(`Soft delete ${cityName}? It will stop appearing publicly but remain in the database.`)) event.preventDefault();
    }}>
      <input type="hidden" name="id" value={cityId} />
      <button type="submit" disabled={pending} className="text-xs font-bold text-red-700 hover:text-red-900 disabled:text-stone-400">{pending ? "Deleting…" : "Delete"}</button>
      {state.status === "error" && <p className="mt-1 max-w-48 text-[0.68rem] text-red-700" role="alert">{state.message}</p>}
    </form>
  );
}
