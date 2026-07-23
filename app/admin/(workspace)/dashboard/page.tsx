import type { Metadata } from "next";

import { DashboardCard } from "@/components/admin/DashboardCard";
import { MetalType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Database overview for the RateStack administration workspace.",
};

export const dynamic = "force-dynamic";

async function getDashboardMetrics() {
  const [totalStates, totalCities, goldRateRecords, silverRateRecords, latestRate] = await Promise.all([
    prisma.state.count(),
    prisma.city.count(),
    prisma.metalRate.count({ where: { metalType: MetalType.GOLD } }),
    prisma.metalRate.count({ where: { metalType: MetalType.SILVER } }),
    prisma.metalRate.aggregate({ _max: { updatedAt: true } }),
  ]);

  return {
    totalStates,
    totalCities,
    goldRateRecords,
    silverRateRecords,
    lastDatabaseUpdate: latestRate._max.updatedAt,
  };
}

function formatUpdate(update: Date | null) {
  if (!update) {
    return {
      date: "No records",
      time: "The database has not received a rate update yet.",
      dateTime: undefined,
    };
  }

  return {
    date: new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }).format(update),
    time: `${new Intl.DateTimeFormat("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    }).format(update)} IST`,
    dateTime: update.toISOString(),
  };
}

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();
  const lastUpdate = formatUpdate(metrics.lastDatabaseUpdate);

  return (
    <div className="mx-auto max-w-[96rem]">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live database overview
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950 sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
            A current snapshot of locations and metal-rate records stored in PostgreSQL.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs leading-5 text-stone-500 shadow-sm">
          <span className="block font-bold text-stone-800">Secure admin session</span>
          Rate management is available to authenticated administrators.
        </div>
      </div>

      <section className="mt-8" aria-labelledby="database-metrics-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="database-metrics-title" className="text-sm font-black uppercase tracking-[0.14em] text-stone-700">
            Database metrics
          </h2>
          <span className="text-xs font-semibold text-stone-400">Fetched through Prisma</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <DashboardCard
            label="Total States"
            value={metrics.totalStates.toLocaleString("en-IN")}
            description="All state records"
            marker="ST"
          />
          <DashboardCard
            label="Total Cities"
            value={metrics.totalCities.toLocaleString("en-IN")}
            description="All city records"
            marker="CT"
          />
          <DashboardCard
            label="Gold Rate Records"
            value={metrics.goldRateRecords.toLocaleString("en-IN")}
            description="Records across all purities"
            marker="AU"
            tone="gold"
          />
          <DashboardCard
            label="Silver Rate Records"
            value={metrics.silverRateRecords.toLocaleString("en-IN")}
            description="Records across all purities"
            marker="AG"
            tone="silver"
          />
          <DashboardCard
            label="Last Database Update"
            value={
              lastUpdate.dateTime ? (
                <time dateTime={lastUpdate.dateTime}>{lastUpdate.date}</time>
              ) : (
                lastUpdate.date
              )
            }
            description={lastUpdate.time}
            marker="DB"
            tone="green"
          />
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="Admin stage status">
        <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-stone-500">Data source</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-800">DB</span>
            <div>
              <h2 className="font-bold text-stone-950">PostgreSQL connected</h2>
              <p className="mt-1 text-sm text-stone-500">Dashboard values are read directly through the shared Prisma client.</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-stone-500">Access status</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-xs font-black text-amber-800">UI</span>
            <div>
              <h2 className="font-bold text-stone-950">Administrator protected</h2>
              <p className="mt-1 text-sm text-stone-500">Auth.js sessions and route protection secure this workspace.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
