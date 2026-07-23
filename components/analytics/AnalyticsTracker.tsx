"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type LocationDetail = {
  citySlug: string | null;
  cityName: string | null;
  stateSlug: string | null;
  stateName: string | null;
};

type AnalyticsPayload = LocationDetail & {
  eventKey: string;
  eventType: "PAGE_VIEW" | "CITY_VIEW";
  path: string;
  pageTitle: string | null;
};

function readVisibleLocation(): LocationDetail {
  const element = document.querySelector<HTMLElement>(
    "[data-analytics-location]",
  );

  return {
    citySlug: element?.dataset.citySlug || null,
    cityName: element?.dataset.cityName || null,
    stateSlug: element?.dataset.stateSlug || null,
    stateName: element?.dataset.stateName || null,
  };
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const requestQueue = useRef<Promise<void>>(Promise.resolve());
  const lastPagePath = useRef<string | null>(null);

  const enqueue = useCallback((payload: AnalyticsPayload) => {
    if (navigator.doNotTrack === "1") return;

    requestQueue.current = requestQueue.current
      .catch(() => undefined)
      .then(async () => {
        await fetch("/api/analytics/track", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastPagePath.current === pathname) return;

    lastPagePath.current = pathname;
    enqueue({
      eventKey: crypto.randomUUID(),
      eventType: "PAGE_VIEW",
      path: pathname,
      pageTitle: document.title || null,
      ...readVisibleLocation(),
    });
  }, [enqueue, pathname]);

  useEffect(() => {
    function handleCityView(event: Event) {
      const detail = (event as CustomEvent<LocationDetail>).detail;

      enqueue({
        eventKey: crypto.randomUUID(),
        eventType: "CITY_VIEW",
        path: pathname || "/",
        pageTitle: document.title || null,
        citySlug: detail.citySlug,
        cityName: detail.cityName,
        stateSlug: detail.stateSlug,
        stateName: detail.stateName,
      });
    }

    window.addEventListener("analytics:city-view", handleCityView);
    return () =>
      window.removeEventListener("analytics:city-view", handleCityView);
  }, [enqueue, pathname]);

  return null;
}
