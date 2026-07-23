import type { Metadata } from "next";

import { DashboardCard } from "@/components/admin/DashboardCard";
import { getAnalyticsConfiguration } from "@/lib/analytics/config";
import { getAnalyticsReport } from "@/lib/analytics/reporting";

export const metadata: Metadata = {
  title: "Analytics",
  description:
    "First-party visitor, session, page, and city analytics for the public website.",
};

export const dynamic = "force-dynamic";

function pageLabel(path: string) {
  return path === "/" ? "Homepage" : path;
}

function RankingBar({
  value,
  maximum,
}: {
  value: number;
  maximum: number;
}) {
  const width = maximum > 0 ? Math.max(5, (value / maximum) * 100) : 0;

  return (
    <div
      aria-hidden="true"
      className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100"
    >
      <div
        className="h-full rounded-full bg-amber-400"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default async function AnalyticsPage() {
  const [report, configuration] = await Promise.all([
    getAnalyticsReport(),
    Promise.resolve(getAnalyticsConfiguration()),
  ]);
  const maximumPageViews = report.mostVisitedPages[0]?.views ?? 0;
  const maximumCityViews = report.mostViewedCities[0]?.views ?? 0;

  return (
    <div className="mx-auto max-w-[96rem]">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            First-party reporting
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950 sm:text-5xl">
            Analytics
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
            Local visitor activity for the last {report.reportingWindowDays} days.
            Total Visitors is the all-time visitor count.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs leading-5 text-stone-500 shadow-sm">
          <span className="block font-bold text-stone-800">Google Analytics 4</span>
          {configuration.ga4Enabled
            ? `Connected · ${configuration.measurementId}`
            : "Not configured"}
        </div>
      </div>

      <section
        className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Analytics summary"
      >
        <DashboardCard
          label="Total Visitors"
          value={report.totalVisitors.toLocaleString("en-IN")}
          description="All-time visitor profiles"
          marker="TV"
          tone="gold"
        />
        <DashboardCard
          label="Unique Visitors"
          value={report.uniqueVisitors.toLocaleString("en-IN")}
          description={`${report.reportingWindowDays}-day visitors`}
          marker="UV"
          tone="green"
        />
        <DashboardCard
          label="Page Views"
          value={report.pageViews.toLocaleString("en-IN")}
          description={`${report.reportingWindowDays}-day public views`}
          marker="PV"
        />
        <DashboardCard
          label="Sessions"
          value={report.sessions.toLocaleString("en-IN")}
          description={`${report.reportingWindowDays}-day sessions`}
          marker="SS"
        />
        <DashboardCard
          label="Returning Visitors"
          value={report.returningVisitors.toLocaleString("en-IN")}
          description="Visitors with a new session"
          marker="RV"
          tone="green"
        />
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-5 sm:px-6">
            <h2 className="font-display text-2xl font-bold text-stone-950">
              Most Visited Pages
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Public page views in the reporting window
            </p>
          </div>
          {report.mostVisitedPages.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-stone-500">
              Page activity will appear after the first public visit.
            </p>
          ) : (
            <ol className="divide-y divide-stone-100">
              {report.mostVisitedPages.map((page, index) => (
                <li
                  key={page.path}
                  className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:px-6"
                >
                  <span className="text-xs font-black text-stone-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-stone-900">
                      {pageLabel(page.path)}
                    </p>
                    <RankingBar value={page.views} maximum={maximumPageViews} />
                  </div>
                  <span className="text-sm font-black text-stone-700">
                    {page.views.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-5 sm:px-6">
            <h2 className="font-display text-2xl font-bold text-stone-950">
              Most Viewed Cities
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              City rates displayed in the reporting window
            </p>
          </div>
          {report.mostViewedCities.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-stone-500">
              City activity will appear after visitors view city rates.
            </p>
          ) : (
            <ol className="divide-y divide-stone-100">
              {report.mostViewedCities.map((city, index) => (
                <li
                  key={city.citySlug}
                  className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:px-6"
                >
                  <span className="text-xs font-black text-stone-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-stone-900">
                      {city.cityName}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {city.stateName ?? "India"}
                    </p>
                    <RankingBar value={city.views} maximum={maximumCityViews} />
                  </div>
                  <span className="text-sm font-black text-stone-700">
                    {city.views.toLocaleString("en-IN")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>
    </div>
  );
}
