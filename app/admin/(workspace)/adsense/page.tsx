import type { Metadata } from "next";

import { getAdSenseConfiguration } from "@/lib/adsense/config";

export const metadata: Metadata = {
  title: "AdSense",
  description:
    "Google AdSense Auto Ads configuration and verification status.",
};

export const dynamic = "force-dynamic";

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${
        active
          ? "bg-emerald-50 text-emerald-800"
          : "bg-stone-100 text-stone-600"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export default function AdSensePage() {
  const configuration = getAdSenseConfiguration();

  const items = [
    {
      label: "Publisher ID",
      value: configuration.publisherId ?? "Not configured",
      active: Boolean(configuration.publisherId),
      activeLabel: "Configured",
      inactiveLabel: "Missing",
    },
    {
      label: "Auto Ads Status",
      value: configuration.autoAdsEnabled
        ? "Public-page script enabled"
        : "Auto Ads script disabled",
      active: configuration.autoAdsEnabled,
      activeLabel: "Enabled",
      inactiveLabel: "Disabled",
    },
    {
      label: "Ads.txt Status",
      value: configuration.adsTxtReady
        ? "Available at /ads.txt"
        : "Requires a valid AdSense client",
      active: configuration.adsTxtReady,
      activeLabel: "Ready",
      inactiveLabel: "Not ready",
    },
    {
      label: "Site Verification Status",
      value: configuration.siteVerificationConfigured
        ? "Verification metadata configured"
        : "Verification metadata missing",
      active: configuration.siteVerificationConfigured,
      activeLabel: "Configured",
      inactiveLabel: "Not configured",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div>
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
          <span
            className={`h-2 w-2 rounded-full ${
              configuration.client ? "bg-emerald-500" : "bg-stone-400"
            }`}
          />
          Advertising configuration
        </div>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950 sm:text-5xl">
          AdSense
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base">
          Review the public Auto Ads configuration. Revenue, click, and
          impression reporting remains in the official Google AdSense dashboard.
        </p>
      </div>

      <section
        className="mt-8 grid gap-4 sm:grid-cols-2"
        aria-label="AdSense configuration status"
      >
        {items.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">
                {item.label}
              </p>
              <StatusBadge
                active={item.active}
                activeLabel={item.activeLabel}
                inactiveLabel={item.inactiveLabel}
              />
            </div>
            <p className="mt-6 break-words font-display text-2xl font-bold text-stone-950">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 sm:p-6">
        <h2 className="font-display text-2xl font-bold text-stone-950">
          Manage your AdSense account
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          Use Google&apos;s dashboard to enable Auto Ads, review site approval,
          and access supported performance and payment reports.
        </p>
        <a
          href="https://www.google.com/adsense/"
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-black text-white transition-colors hover:bg-amber-800 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-amber-600"
        >
          Open Google AdSense Dashboard
        </a>
      </section>
    </div>
  );
}
