import { ScraperRejectedError } from "@/lib/scrapers/errors";
import type { ScrapedRateResult } from "@/lib/scrapers/types";

export const MAX_SOURCE_FUTURE_SKEW_MS = 5 * 60 * 1_000;

function istDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(value);
}

function istCalendarDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function selectedSourceValue(result: ScrapedRateResult, mappedPurity: string) {
  const quote = result.quotes.find((candidate) => candidate.mappedPurity === mappedPurity);
  if (!quote) return null;
  return result.preferredSession === "PM" ? quote.pm : quote.am;
}

export function assertValidScrapedResult(
  result: ScrapedRateResult,
  nowMs = Date.now(),
  attemptedAt = new Date(nowMs).toISOString(),
) {
  const recordedAt = new Date(result.recordedAt);
  if (Number.isNaN(recordedAt.getTime())) {
    throw new ScraperRejectedError("The source timestamp is invalid.");
  }
  const now = new Date(nowMs);
  const differenceMinutes = (recordedAt.getTime() - nowMs) / 60_000;
  const sameIstCalendarDate = result.sourceDate === istCalendarDate(now);
  const beyondThreshold = recordedAt.getTime() > nowMs + MAX_SOURCE_FUTURE_SKEW_MS;
  const validationDecision = beyondThreshold && !sameIstCalendarDate
    ? "REJECTED_FUTURE"
    : beyondThreshold ? "ACCEPTED_CURRENT_IST_DATE" : "ACCEPTED";
  const diagnostics = {
    sourceDate: result.sourceDate,
    sourceTime: result.sourceTime,
    recordedAt: result.recordedAt,
    fetchedAt: result.fetchedAt,
    attemptedAt,
    currentServerTimeUtc: now.toISOString(),
    currentServerTimeAsiaKolkata: istDateTime(now),
    computedSourceTimestamp: recordedAt.toISOString(),
    currentUtc: now.toISOString(),
    currentIst: istDateTime(now),
    computedSourceUtc: recordedAt.toISOString(),
    computedSourceIst: istDateTime(recordedAt),
    differenceMinutes: Number(differenceMinutes.toFixed(3)),
    validationThresholdMinutes: MAX_SOURCE_FUTURE_SKEW_MS / 60_000,
    sameIstCalendarDate,
    validationDecision,
  };
  console.info("[rate-sync] source timestamp validation", diagnostics);
  if (validationDecision === "REJECTED_FUTURE") {
    throw new ScraperRejectedError("The source timestamp is in the future.", {
      ...diagnostics,
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
