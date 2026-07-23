import assert from "node:assert/strict";
import test from "node:test";

import {
  getAdSenseConfiguration,
  normalizeAdSenseClient,
} from "../lib/adsense/config";
import {
  getAnalyticsConfiguration,
  normalizeGa4MeasurementId,
} from "../lib/analytics/config";
import {
  analyticsEventSchema,
  isPublicAnalyticsPath,
} from "../lib/analytics/payload";

test("GA4 configuration accepts measurement IDs and disables invalid values", () => {
  assert.equal(normalizeGa4MeasurementId(" g-example123 "), "G-EXAMPLE123");
  assert.equal(normalizeGa4MeasurementId("UA-12345-1"), null);

  assert.deepEqual(
    getAnalyticsConfiguration({
      NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-EXAMPLE123",
    }),
    {
      measurementId: "G-EXAMPLE123",
      ga4Enabled: true,
    },
  );
});

test("AdSense configuration requires a valid client and never invents one", () => {
  const validClient = `ca-pub-${"1".repeat(16)}`;

  assert.equal(normalizeAdSenseClient(validClient), validClient);
  assert.equal(normalizeAdSenseClient("pub-invalid"), null);
  assert.deepEqual(getAdSenseConfiguration({}), {
    client: null,
    publisherId: null,
    autoAdsEnabled: false,
    adsTxtReady: false,
    siteVerificationConfigured: false,
  });
});

test("local analytics accepts public events and excludes admin or API paths", () => {
  const event = analyticsEventSchema.safeParse({
    eventKey: "b8519c7c-7f55-4df3-8ca7-1d43757ad416",
    eventType: "PAGE_VIEW",
    path: "/",
    pageTitle: "India Gold & Silver Rates",
    citySlug: "chennai",
    cityName: "Chennai",
    stateSlug: "tamil-nadu",
    stateName: "Tamil Nadu",
  });

  assert.equal(event.success, true);
  assert.equal(isPublicAnalyticsPath("/"), true);
  assert.equal(isPublicAnalyticsPath("/cities/chennai"), true);
  assert.equal(isPublicAnalyticsPath("/admin/analytics"), false);
  assert.equal(isPublicAnalyticsPath("/api/rates/national"), false);
});
