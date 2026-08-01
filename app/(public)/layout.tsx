import type { ReactNode } from "react";

import { GoogleAdSense } from "@/components/adsense/GoogleAdSense";
import { AnalyticsTracker } from "@/components/analytics/AnalyticsTracker";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MobileBottomNavigation } from "@/components/shop/MobileBottomNavigation";
import { getAdSenseConfiguration } from "@/lib/adsense/config";
import { getAnalyticsConfiguration } from "@/lib/analytics/config";

export default function PublicLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const analytics = getAnalyticsConfiguration();
  const adsense = getAdSenseConfiguration();

  return (
    <>
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {children}
      </div>
      <MobileBottomNavigation />
      <AnalyticsTracker />
      {analytics.measurementId && (
        <GoogleAnalytics measurementId={analytics.measurementId} />
      )}
      {adsense.client && <GoogleAdSense client={adsense.client} />}
    </>
  );
}

