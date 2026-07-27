import { ScraperRejectedError } from "@/lib/scrapers/errors";
import type { ScrapedRateResult } from "@/lib/scrapers/types";

export const MAX_SOURCE_FUTURE_SKEW_MS = 5 * 60 * 1_000;

export function selectedSourceValue(result: ScrapedRateResult, mappedPurity: string) {
  const quote = result.quotes.find((candidate) => candidate.mappedPurity === mappedPurity);
  if (!quote) return null;
  return result.preferredSession === "PM" ? quote.pm : quote.am;
}

export function assertValidScrapedResult(
  result: ScrapedRateResult,
  nowMs = Date.now(),
) {
  const recordedAt = new Date(result.recordedAt);
  if (Number.isNaN(recordedAt.getTime())) {
    throw new ScraperRejectedError("The source timestamp is invalid.");
  }
  if (recordedAt.getTime() > nowMs + MAX_SOURCE_FUTURE_SKEW_MS) {
    throw new ScraperRejectedError("The source timestamp is in the future.", {
      recordedAt: result.recordedAt,
    });
  }

  const requiredPurities = ["K24", "K22", "P999"];
  for (const purity of requiredPurities) {
    const value = selectedSourceValue(result, purity);
    const pricePerGram = Number(value?.pricePerGram);
    if (!value || !Number.isFinite(pricePerGram) || pricePerGram <= 0) {
      throw new ScraperRejectedError(`The source is missing a valid ${purity} value.`);
    }
    if (value.pricePerKilogram !== null) {
      const pricePerKilogram = Number(value.pricePerKilogram);
      if (!Number.isFinite(pricePerKilogram) || pricePerKilogram <= 0) {
        throw new ScraperRejectedError(`The source has an invalid ${purity} kilogram value.`);
      }
    }
  }
}

export function assertCrossSourceVariance(
  primary: ScrapedRateResult,
  fallback: ScrapedRateResult,
  maxChangePercent: number,
) {
  const violations: Array<Record<string, unknown>> = [];
  for (const purity of ["K24", "K22", "P999"]) {
    const primaryValue = Number(selectedSourceValue(primary, purity)?.pricePerGram);
    const fallbackValue = Number(selectedSourceValue(fallback, purity)?.pricePerGram);
    if (!Number.isFinite(primaryValue) || !Number.isFinite(fallbackValue)) continue;

    const variance = Math.abs((fallbackValue - primaryValue) / primaryValue) * 100;
    if (!Number.isFinite(variance) || variance > maxChangePercent) {
      violations.push({
        purity,
        primary: primaryValue,
        fallback: fallbackValue,
        variancePercent: Number.isFinite(variance) ? Number(variance.toFixed(2)) : "invalid",
      });
    }
  }

  if (violations.length > 0) {
    throw new ScraperRejectedError(
      `Primary and fallback source values exceeded the configured ${maxChangePercent}% variance limit.`,
      { violations },
    );
  }
}

export function assertSourceTimestampNotOlder(
  incomingRecordedAt: string | Date,
  existingRecordedAt: string | Date,
) {
  const incoming = new Date(incomingRecordedAt).getTime();
  const existing = new Date(existingRecordedAt).getTime();
  if (!Number.isFinite(incoming) || !Number.isFinite(existing) || incoming < existing) {
    throw new ScraperRejectedError("The source date is older than the stored rate.");
  }
}
