"use client";

import { useActionState } from "react";

import {
  syncRatesAction,
  testScraperAction,
  type ScraperActionState,
} from "@/app/admin/(workspace)/api-logs/actions";
import { ScraperResultTable } from "@/components/admin/scraper/ScraperResultTable";

const INITIAL_STATE: ScraperActionState = {
  status: "idle",
  message: "",
};

function ActionNotice({ state }: { state: ScraperActionState }) {
  if (state.status === "idle") return null;

  const success = state.status === "success";
  return (
    <div
      className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold leading-6 ${
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
      role={success ? "status" : "alert"}
    >
      <span className="font-black">{state.outcome}: </span>
      {state.message}
      {state.database && (
        <span className="mt-1 block text-xs font-semibold">
          Created {state.database.created}, updated {state.database.updated}, unchanged {state.database.unchanged}, history entries {state.database.historyEntries}.
        </span>
      )}
    </div>
  );
}

export function ScraperControls({ enabled }: { enabled: boolean }) {
  const [testState, testAction, testPending] = useActionState(
    testScraperAction,
    INITIAL_STATE,
  );
  const [syncState, syncAction, syncPending] = useActionState(
    syncRatesAction,
    INITIAL_STATE,
  );
  const busy = testPending || syncPending;
  const displayedResult = syncState.parsed ?? testState.parsed;

  return (
    <>
      <section className="mt-7 grid gap-4 lg:grid-cols-2" aria-label="Scraper actions">
        <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">Safe validation</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-stone-950">Test Scraper</h2>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            Fetch and parse the live public page, validate all values, and save an attempt log. Metal rates are never changed in test mode.
          </p>
          <form action={testAction} className="mt-5">
            <button
              type="submit"
              disabled={!enabled || busy}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-300 bg-emerald-50 px-5 text-sm font-black text-emerald-900 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400"
            >
              {testPending ? "Testing source..." : "Test Scraper"}
            </button>
          </form>
          <ActionNotice state={testState} />
        </article>

        <article className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-amber-800">Transactional update</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-stone-950">Sync Rates Now</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Prefer complete PM values, fall back to AM, validate the change limit, and update only source-owned national rates with history entries.
          </p>
          <form
            action={syncAction}
            className="mt-5"
            onSubmit={(event) => {
              if (!window.confirm("Sync validated live rates into the database now?")) {
                event.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              disabled={!enabled || busy}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-black text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500"
            >
              {syncPending ? "Synchronizing..." : "Sync Rates Now"}
            </button>
          </form>
          <ActionNotice state={syncState} />
        </article>
      </section>

      {displayedResult && <ScraperResultTable result={displayedResult} />}
    </>
  );
}
