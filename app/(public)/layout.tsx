import type { ReactNode } from "react";

import { GoogleAdSense } from "@/components/adsense/GoogleAdSense";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { getAdSenseConfiguration } from "@/lib/adsense/config";
import { getAnalyticsConfiguration } from "@/lib/analytics/config";

export default function PublicLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const analytics = getAnalyticsConfiguration();
  const adsense = getAdSenseConfiguration();

  return (
    <>
      {children}
      <AnalyticsTracker />
      {analytics.measurementId && (
        <GoogleAnalytics measurementId={analytics.measurementId} />
      )}
      {adsense.client && <GoogleAdSense client={adsense.client} />}
    </>
  );
}
