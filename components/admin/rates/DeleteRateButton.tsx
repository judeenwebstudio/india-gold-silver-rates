"use client";

import { useActionState } from "react";

import { softDeleteRateAction } from "@/app/admin/(workspace)/rates/actions";
import type { RateActionState } from "@/lib/rate-management";

type DeleteRateButtonProps = {
  rateId: string;
  rateLabel: string;
};

const INITIAL_STATE: RateActionState = {
  status: "idle",
  message: "",
};

export function DeleteRateButton({ rateId, rateLabel }: DeleteRateButtonProps) {
  const [actionState, formAction, pending] = useActionState(
    softDeleteRateAction,
    INITIAL_STATE,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(`Soft delete ${rateLabel}? The record will remain in the database and Rate History.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={rateId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-bold text-red-700 hover:text-red-900 disabled:cursor-wait disabled:text-stone-400"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {actionState.status === "error" && (
        <p className="mt-1 max-w-40 text-[0.68rem] leading-4 text-red-700" role="alert">
          {actionState.message}
        </p>
      )}
    </form>
  );
}
