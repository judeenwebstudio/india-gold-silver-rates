const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
export const RATESTACK_GA4_MEASUREMENT_ID = "G-3BSKW3TWWW";

export type AnalyticsConfiguration = {
  measurementId: string | null;
  ga4Enabled: boolean;
};

export function normalizeGa4MeasurementId(value: string | undefined) {
  const measurementId = value?.trim().toUpperCase() ?? "";
  return GA4_MEASUREMENT_ID_PATTERN.test(measurementId) ? measurementId : null;
}

export function getAnalyticsConfiguration(): AnalyticsConfiguration {
  return {
    measurementId: RATESTACK_GA4_MEASUREMENT_ID,
    ga4Enabled: true,
  };
}
