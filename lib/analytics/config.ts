const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

export type AnalyticsConfiguration = {
  measurementId: string | null;
  ga4Enabled: boolean;
};

type Environment = Record<string, string | undefined>;

export function normalizeGa4MeasurementId(value: string | undefined) {
  const measurementId = value?.trim().toUpperCase() ?? "";
  return GA4_MEASUREMENT_ID_PATTERN.test(measurementId) ? measurementId : null;
}

export function getAnalyticsConfiguration(
  environment: Environment = process.env,
): AnalyticsConfiguration {
  const measurementId = normalizeGa4MeasurementId(
    environment.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  );

  return {
    measurementId,
    ga4Enabled: Boolean(measurementId),
  };
}
