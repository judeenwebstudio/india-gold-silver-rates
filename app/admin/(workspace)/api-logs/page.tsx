import type { Metadata } from "next";

import { ScraperControls } from "@/components/admin/scraper/ScraperControls";
import { getScraperConfig } from "@/lib/scrapers/config";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "API Logs",
  description: "Test, synchronize, and audit configured public rate-source updates.",
};

export const dynamic = "force-dynamic";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

function getConfigSummary() {
  try {
    const config = getScraperConfig();
    return { valid: true as const, config, message: "Configuration valid" };
  } catch (error) {
    return {
      valid: false as const,
      config: null,
      message: error instanceof Error ? error.message : "Configuration invalid",
    };
  }
}

const statusClasses = {
  SUCCESS: "bg-emerald-50 text-emerald-800",
  FAILED: "bg-red-50 text-red-800",
  REJECTED: "bg-amber-50 text-amber-900",
} as const;

export default async function ApiLogsPage() {
  const configuration = getConfigSummary();
  const logs = await prisma.rateUpdateLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-[96rem]">
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            <span className={`h-2 w-2 rounded-full ${configuration.config?.enabled ? "bg-emerald-500" : "bg-stone-400"}`} />
            Configurable rate source
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950 sm:text-5xl">
            API Logs &amp; Scraper
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
            Test the configured public provider, synchronize validated national rates, and review every successful, failed, or rejected attempt.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs leading-5 text-stone-500 shadow-sm">
          <span className="block font-bold text-stone-800">Manual execution only</span>
          Scheduling is intentionally not enabled in this stage.
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Source configuration">
        <article className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-stone-500">Provider</p>
          <p className="mt-2 font-display text-2xl font-bold text-stone-950">{configuration.config?.name ?? "Invalid"}</p>
          <p className="mt-1 text-xs text-stone-500">Reusable provider registry</p>
        </article>
        <article className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm sm:col-span-2 xl:col-span-1">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-stone-500">Source URL</p>
          {configuration.config ? (
            <a href={configuration.config.url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-sm font-bold text-amber-800 hover:underline">
              {configuration.config.url}
            </a>
          ) : (
            <p className="mt-2 text-sm font-bold text-red-700">Unavailable</p>
          )}
          <p className="mt-1 text-xs text-stone-500">Public HTTPS page only</p>
        </article>
        <article className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-stone-500">Change limit</p>
          <p className="mt-2 font-display text-2xl font-bold text-stone-950">{configuration.config?.maxChangePercent ?? "—"}%</p>
          <p className="mt-1 text-xs text-stone-500">Compared with prior provider rates</p>
        </article>
        <article className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-stone-500">Status</p>
          <p className={`mt-2 text-sm font-black ${configuration.valid && configuration.config.enabled ? "text-emerald-700" : "text-red-700"}`}>
            {configuration.valid && configuration.config.enabled ? "Enabled" : configuration.message}
          </p>
          <p className="mt-1 text-xs text-stone-500">Environment controlled</p>
        </article>
      </section>

      <ScraperControls enabled={Boolean(configuration.valid && configuration.config.enabled)} />

      <section className="mt-8" aria-labelledby="attempt-log-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="attempt-log-title" className="text-sm font-black uppercase tracking-[0.14em] text-stone-700">Attempt log</h2>
            <p className="mt-1 text-xs text-stone-500">Latest 50 scraper and rate-update records</p>
          </div>
          <span className="text-xs font-semibold text-stone-400">Stored in PostgreSQL</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {logs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-stone-500">No update attempts have been recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                <thead className="bg-stone-50 text-[0.65rem] font-black uppercase tracking-[0.12em] text-stone-500">
                  <tr>
                    <th className="px-5 py-3">Attempted</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Message</th>
                    <th className="px-5 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="align-top text-stone-700">
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold">{formatDateTime(log.createdAt)}</td>
                      <td className="max-w-52 px-5 py-4">
                        <span className="block font-bold text-stone-950">{log.source}</span>
                        <span className="mt-1 block truncate text-xs text-stone-400" title={log.sourceUrl ?? undefined}>{log.sourceUrl ?? "No source URL"}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-black ${statusClasses[log.status]}`}>{log.status}</span>
                      </td>
                      <td className="min-w-72 px-5 py-4 leading-6">{log.message}</td>
                      <td className="px-5 py-4">
                        {log.rawData ? (
                          <details>
                            <summary className="cursor-pointer whitespace-nowrap text-xs font-black text-amber-800">View parsed data</summary>
                            <pre className="mt-3 max-h-80 min-w-80 overflow-auto rounded-xl bg-stone-950 p-4 text-[0.68rem] leading-5 text-stone-200">{JSON.stringify(log.rawData, null, 2)}</pre>
                          </details>
                        ) : (
                          <span className="text-xs text-stone-400">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
