import {
  MetalPurity,
  MetalType,
  Prisma,
  RateHistoryAction,
  RateProvider,
  RateSourceType,
  RateSourceUnit,
  RateValidationStatus,
  RateSyncExecutionType,
  RateUpdateStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  RetryExecutionError,
  runLockedRetryPipeline,
} from "@/lib/scheduler/execution";
import {
  acquireRateSyncLease,
  releaseRateSyncLease,
} from "@/lib/scheduler/lock";
import { rateValuesAreEqual } from "@/lib/scheduler/rate-values";
import type { CronSlot } from "@/lib/scheduler/cron-slot";
import { getScraperConfig, logResolvedProviderOrder } from "@/lib/scrapers/config";
import {
  RateSyncLockUnavailableError,
  ScraperError,
  ScraperRejectedError,
} from "@/lib/scrapers/errors";
import { createRateScraperProviders } from "@/lib/scrapers/registry";
import {
  assertCrossSourceVariance,
  assertSourceTimestampNotOlder,
  assertValidScrapedResult,
} from "@/lib/scrapers/validation";
import type {
  NormalizedSessionRate,
  ScrapedRateQuote,
  ScrapedRateResult,
  ScraperMappedPurity,
  ScraperMetalType,
  ScraperProviderConfig,
  ScraperSourceAttempt,
  RateScraperProvider,
} from "@/lib/scrapers/types";
import { duplicateGoodReturnsMappings, resolveGoodReturnsCity } from "@/lib/scrapers/providers/goodreturns-city";
import { GoodReturnsRateProvider } from "@/lib/scrapers/providers/goodreturns";

export type ScraperMode =
  | "MANUAL_TEST"
  | "MANUAL_SYNC"
  | "AUTOMATIC_CRON";

export type ScraperDatabaseSummary = {
  created: number;
  updated: number;
  unchanged: number;
  historyEntries: number;
  metadataUpdated: number;
};

export type ScraperExecutionResult = {
  ok: boolean;
  outcome: "SUCCESS" | "NO_CHANGE" | "FAILED" | "REJECTED";
  message: string;
  logId?: string;
  parsed?: ScrapedRateResult;
  database?: ScraperDatabaseSummary;
  attemptCount?: number;
  locked?: boolean;
  cronSlot?: CronSlot;
  mappingReport?: GoodReturnsMappingReport;
};

export type GoodReturnsMappingReport = {
  totalActiveCities: number;
  successfullyMapped: number;
  unsupported: number;
  failed: number;
  duplicateMappings: number;
  unsupportedCities: Array<{ cityId: string; city: string; state: string; providerSlug: string; reason: string }>;
  failedCities: Array<{ cityId: string; city: string; state: string; providerSlug: string; reason: string }>;
  duplicates: ReturnType<typeof duplicateGoodReturnsMappings>;
  correctMappings: GoodReturnsMappingRow[];
  incorrectMappings: GoodReturnsMappingRow[];
  aliasMappings: GoodReturnsMappingRow[];
  missingMappings: GoodReturnsMappingRow[];
  first100Mismatches: GoodReturnsMappingRow[];
  csv: string;
};

type GoodReturnsMappingRow = {
  rateStackState: string;
  rateStackCity: string;
  providerSlug: string;
  parsedCity: string;
  status: "CORRECT" | "ALIAS" | "CITY_MISMATCH" | "MISSING" | "FAILED" | "DUPLICATE";
  resolvedCityId: string;
  finalUrl?: string;
  title?: string;
  h1?: string;
  reason?: string;
};

type SelectedMappedRate = {
  quote: ScrapedRateQuote;
  selected: NormalizedSessionRate;
  purity: ScraperMappedPurity;
};

type RateSnapshotSource = {
  id: string;
  metalType: MetalType;
  purity: MetalPurity;
  pricePerGram: { toString(): string };
  pricePerKilogram: { toString(): string } | null;
  cityId: string | null;
  source: string;
  recordedAt: Date;
  isActive: boolean;
  deletedAt: Date | null;
};

function parsedRateSummary(result: ScrapedRateResult) {
  return result.quotes
    .filter((quote) => quote.mappedPurity)
    .map((quote) => {
      const selected = result.preferredSession === "PM" ? quote.pm : quote.am;
      return {
        label: quote.label,
        metalType: quote.metalType,
        purity: quote.mappedPurity,
        sourceUnit: quote.sourceUnit,
        conversion:
          quote.sourceUnit === "PER_10_GRAMS"
            ? "divide by 10"
            : quote.sourceUnit === "PER_KILOGRAM"
              ? "divide by 1000"
              : "none (already per gram)",
        sourceValue: selected?.sourceValue ?? null,
        pricePerGram: selected?.pricePerGram ?? null,
        pricePerKilogram: selected?.pricePerKilogram ?? null,
      };
    });
}

function logParsedRates(
  executionType: ScraperMode,
  result: ScrapedRateResult,
  attempt: number,
) {
  console.info("[rate-sync] parsed rates", {
    executionType,
    attempt,
    provider: result.provider,
    sourceUrl: result.sourceUrl,
    sourceDate: result.sourceDate,
    sourceTime: result.sourceTime,
    preferredSession: result.preferredSession,
    fetchedAt: result.fetchedAt,
    rates: parsedRateSummary(result),
  });
}

function toMetalType(value: ScraperMetalType) {
  return value === "GOLD" ? MetalType.GOLD : MetalType.SILVER;
}

function toSnapshot(rate: RateSnapshotSource): Prisma.InputJsonObject {
  return {
    id: rate.id,
    metalType: rate.metalType,
    purity: rate.purity,
    pricePerGram: rate.pricePerGram.toString(),
    pricePerKilogram: rate.pricePerKilogram?.toString() ?? null,
    cityId: rate.cityId,
    source: rate.source,
    recordedAt: rate.recordedAt.toISOString(),
    isActive: rate.isActive,
    deletedAt: rate.deletedAt?.toISOString() ?? null,
  };
}

function selectedMappedRates(result: ScrapedRateResult): SelectedMappedRate[] {
  return result.quotes.flatMap((quote) => {
    if (!quote.mappedPurity) return [];

    const selected = result.preferredSession === "PM" ? quote.pm : quote.am;
    if (!selected) {
      throw new ScraperRejectedError(
        `${quote.label} is missing the preferred ${result.preferredSession} value.`,
      );
    }

    const pricePerGram = Number(selected.pricePerGram);
    const pricePerKilogram = selected.pricePerKilogram
      ? Number(selected.pricePerKilogram)
      : null;
    if (
      !Number.isFinite(pricePerGram) ||
      pricePerGram <= 0 ||
      (pricePerKilogram !== null &&
        (!Number.isFinite(pricePerKilogram) || pricePerKilogram <= 0))
    ) {
      throw new ScraperRejectedError(
        `${quote.label} contains an invalid normalized value; stored rates were preserved.`,
        { label: quote.label, pricePerGram: selected.pricePerGram },
      );
    }

    return [{ quote, selected, purity: quote.mappedPurity }];
  });
}

async function validateChangeThreshold(
  config: ScraperProviderConfig,
  result: ScrapedRateResult,
) {
  assertValidScrapedResult(result);
  const staleHours = Number(process.env.RATE_STALE_HOURS ?? "72");
  const ageMs = Date.now() - new Date(result.recordedAt).getTime();
  if (!Number.isFinite(staleHours) || staleHours <= 0 || ageMs > staleHours * 60 * 60 * 1000) {
    throw new ScraperRejectedError(`The source rate is stale beyond the configured ${staleHours}-hour threshold.`);
  }
  const selectedRates = selectedMappedRates(result);
  const violations: Array<Record<string, unknown>> = [];
  const stale: string[] = [];
  const sourceCityId = config.name === "GOODRETURNS" ? result.city?.cityId : null;
  if (config.name === "GOODRETURNS" && !sourceCityId) {
    throw new ScraperRejectedError("The requested GoodReturns city context is unavailable.");
  }

  await Promise.all(
    selectedRates.map(async ({ quote, selected, purity }) => {
      const baseline = await prisma.metalRate.findFirst({
        where: {
          cityId: sourceCityId ?? null,
          isActive: true,
          metalType: toMetalType(quote.metalType),
          purity: purity as MetalPurity,
        },
        orderBy: [{ recordedAt: "desc" }, { updatedAt: "desc" }],
        select: { pricePerGram: true, recordedAt: true },
      });

      if (!baseline) return;

      const incomingRecordedAt = new Date(result.recordedAt);
      console.info("[rate-sync] source variance", {
        source: config.name,
        sourceUrl: config.url,
        rate: quote.label,
        existingSourceTimestamp: baseline.recordedAt.toISOString(),
        incomingSourceTimestamp: incomingRecordedAt.toISOString(),
        existingPricePerGram: baseline.pricePerGram.toString(),
        incomingPricePerGram: selected.pricePerGram,
      });
      try {
        assertSourceTimestampNotOlder(incomingRecordedAt, baseline.recordedAt);
      } catch {
        stale.push(quote.label);
        return;
      }

      const previous = Number(baseline.pricePerGram);
      const incoming = Number(selected.pricePerGram);
      const changePercent = Math.abs((incoming - previous) / previous) * 100;

      if (!Number.isFinite(changePercent) || changePercent > config.maxChangePercent) {
        violations.push({
          rate: quote.label,
          previous: previous.toFixed(4),
          incoming: incoming.toFixed(4),
          changePercent: Number.isFinite(changePercent)
            ? Number(changePercent.toFixed(2))
            : "invalid",
        });
      }
    }),
  );

  if (stale.length > 0) {
    throw new ScraperRejectedError(
      "The scraped source date is older than the stored source rates.",
      { staleRates: stale },
    );
  }

  if (violations.length > 0) {
    throw new ScraperRejectedError(
      `One or more rates exceeded the configured ${config.maxChangePercent}% change limit.`,
      { violations },
    );
  }
}

type PreparedScrape = {
  parsed: ScrapedRateResult;
  config: ScraperProviderConfig;
  sourceAttempts: ScraperSourceAttempt[];
};

export async function scrapeWithFallback(
  providers: RateScraperProvider[],
  maxChangePercent: number,
  validate: (
    config: ScraperProviderConfig,
    result: ScrapedRateResult,
  ) => Promise<void> = validateChangeThreshold,
): Promise<PreparedScrape> {
  const sourceAttempts: ScraperSourceAttempt[] = [];
  let lastError: unknown;
  let retryableError: unknown;
  let validPrimary: { parsed: ScrapedRateResult; config: ScraperProviderConfig } | null = null;

  for (const provider of providers) {
    const attemptedAt = new Date().toISOString();
    let parsedForAttempt: ScrapedRateResult | undefined;
    let parsedValidated = false;
    let failureStage = "FETCH_OR_PARSE";
    console.info("[rate-sync] source attempted", {
      provider: provider.name,
      sourceUrl: provider.sourceUrl,
      attemptedAt,
    });

    try {
      const parsed = await provider.scrape();
      parsedForAttempt = parsed;
      console.info("[rate-sync] parsed values before validation", {
        provider: provider.name,
        sourceUrl: provider.sourceUrl,
        sourceDate: parsed.sourceDate,
        sourceRecordedAt: parsed.recordedAt,
        preferredSession: parsed.preferredSession,
        rates: parsedRateSummary(parsed),
      });
      failureStage = "STRUCTURAL_VALIDATION";
      assertValidScrapedResult(parsed);
      parsedValidated = true;

      if (validPrimary) {
        failureStage = "CROSS_SOURCE_VALIDATION";
        assertCrossSourceVariance(validPrimary.parsed, parsed, maxChangePercent);
      }

      failureStage = "DATABASE_VALIDATION";
      await validate(provider.config, parsed);
      console.info("[rate-sync] validation result", {
        provider: provider.name,
        sourceUrl: provider.sourceUrl,
        validationResult: "VALID",
        sourceDate: parsed.sourceDate,
        quoteCount: parsed.quotes.length,
      });
      sourceAttempts.push({
        provider: provider.name,
        sourceUrl: provider.sourceUrl,
        status: "SUCCESS",
        sourceDate: parsed.sourceDate,
        sourceRecordedAt: parsed.recordedAt,
        preferredSession: parsed.preferredSession,
        attemptedAt,
      });
      console.info("[rate-sync] source selected", {
        provider: provider.name,
        sourceUrl: provider.sourceUrl,
        sourceDate: parsed.sourceDate,
        sourceRecordedAt: parsed.recordedAt,
        preferredSession: parsed.preferredSession,
      });
      return { parsed, config: provider.config, sourceAttempts };
    } catch (error) {
      lastError = error;
      if (!(error instanceof ScraperRejectedError)) retryableError = error;
      sourceAttempts.push({
        provider: provider.name,
        sourceUrl: provider.sourceUrl,
        status: error instanceof ScraperRejectedError ? "REJECTED" : "FAILED",
        message: error instanceof Error ? error.message : "Unknown source failure",
        sourceDate: parsedForAttempt?.sourceDate,
        sourceRecordedAt: parsedForAttempt?.recordedAt,
        preferredSession: parsedForAttempt?.preferredSession,
        attemptedAt,
      });
      console.error("[rate-sync] source failed", {
        provider: provider.name,
        sourceUrl: provider.sourceUrl,
        status: error instanceof ScraperRejectedError ? "REJECTED" : "FAILED",
        failureStage,
        reason: error instanceof Error ? error.message : "Unknown source failure",
        details: error instanceof ScraperError ? error.details ?? null : null,
        parsedValues: parsedForAttempt
          ? parsedRateSummary(parsedForAttempt)
          : null,
      });

      if (parsedValidated && parsedForAttempt) {
        validPrimary = { parsed: parsedForAttempt, config: provider.config };
      }
    }
  }

  throw retryableError ?? lastError ?? new ScraperRejectedError("All configured rate sources failed.");
}


function isRetryableTransactionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}

async function writeSynchronizedRates(
  config: ScraperProviderConfig,
  parsed: ScrapedRateResult,
  attemptedAt: string,
  executionType: ScraperMode,
  attemptCount: number,
  startedAtMs: number,
  cronSlot: CronSlot | undefined,
  sourceAttempts: ScraperSourceAttempt[],
) {
  const rates = selectedMappedRates(parsed);
  const recordedAt = new Date(parsed.recordedAt);
  const historySource = `SCRAPER:${config.name}:${executionType}`;
  const provider = config.name === "GOODRETURNS" ? RateProvider.GOODRETURNS : RateProvider.IBJA;
  const sourceType = provider === RateProvider.GOODRETURNS
    ? RateSourceType.SOURCE_PUBLISHED_CITY_RATE
    : RateSourceType.MARKET_REFERENCE_RATE;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const synchronized = await prisma.$transaction(
        async (transaction) => {
          const sourceCityId = provider === RateProvider.GOODRETURNS ? parsed.city?.cityId : null;
          if (provider === RateProvider.GOODRETURNS && !sourceCityId) {
            throw new ScraperRejectedError("The requested GoodReturns city context is unavailable.");
          }
          const summary: ScraperDatabaseSummary = {
            created: 0,
            updated: 0,
            unchanged: 0,
            historyEntries: 0,
            metadataUpdated: 0,
          };
          const decisions: Array<Record<string, unknown>> = [];

          for (const { quote, selected, purity } of rates) {
            const metalType = toMetalType(quote.metalType);
            const existing = await transaction.metalRate.findFirst({
              where: {
                cityId: sourceCityId ?? null,
                isActive: true,
                metalType,
                purity: purity as MetalPurity,
              },
              orderBy: [{ recordedAt: "desc" }, { updatedAt: "desc" }],
            });

            const pricePerKilogram = selected.pricePerKilogram;
            const sourceUnit = quote.sourceUnit as RateSourceUnit;
            const provenance = {
              provider,
              sourceType,
              sourceValue: selected.sourceValue,
              sourceUnit,
              normalizedPer10Grams: (Number(selected.pricePerGram) * 10).toFixed(4),
              normalizedPerKg: (Number(selected.pricePerGram) * 1000).toFixed(4),
              conversionApplied: quote.sourceUnit !== "PER_GRAM",
              conversionFormula: quote.sourceUnit === "PER_10_GRAMS"
                ? "v1: sourceValue / 10"
                : quote.sourceUnit === "PER_KILOGRAM"
                  ? "v1: sourceValue / 1000"
                  : "v1: identity",
              rateDate: recordedAt,
              sourcePublishedAt: recordedAt,
              fetchedAt: new Date(parsed.fetchedAt),
              lastSuccessfulSync: new Date(attemptedAt),
              validationStatus: RateValidationStatus.VALID,
              validationMessage: "Provider response passed city, date, unit and movement validation.",
              sourceReference: parsed.sourceUrl,
              rawResponseHash: "rawResponseHash" in parsed ? String(parsed.rawResponseHash) : null,
              fallbackUsed: false,
              fallbackReason: null,
              originalProvider: provider,
              originalRateDate: recordedAt,
            };
            const valuesUnchanged =
              existing &&
              rateValuesAreEqual(existing, {
                pricePerGram: selected.pricePerGram,
                pricePerKilogram,
              });

            if (valuesUnchanged) {
              if (existing && recordedAt.getTime() > existing.recordedAt.getTime()) {
                await transaction.metalRate.update({
                  where: { id: existing.id },
                  data: { recordedAt, source: config.name, ...provenance },
                });
                summary.metadataUpdated += 1;
                decisions.push({ rate: quote.label, decision: "METADATA_UPDATED" });
              } else {
                decisions.push({ rate: quote.label, decision: "DUPLICATE_SKIPPED" });
              }
              summary.unchanged += 1;
              continue;
            }

            if (existing) {
              const updated = await transaction.metalRate.update({
                where: { id: existing.id },
                data: {
                  pricePerGram: selected.pricePerGram,
                  pricePerKilogram,
                  recordedAt,
                  source: config.name,
                  ...provenance,
                },
              });

              await transaction.rateHistory.create({
                data: {
                  metalRateId: updated.id,
                  metalType,
                  action: RateHistoryAction.UPDATE,
                  previousData: toSnapshot(existing),
                  newData: toSnapshot(updated),
                  source: historySource,
                },
              });
              summary.updated += 1;
              summary.historyEntries += 1;
              decisions.push({ rate: quote.label, decision: "UPDATED" });
            } else {
              const created = await transaction.metalRate.create({
                data: {
                  metalType,
                  purity: purity as MetalPurity,
                  pricePerGram: selected.pricePerGram,
                  pricePerKilogram,
                  cityId: sourceCityId ?? null,
                  source: config.name,
                  recordedAt,
                  ...provenance,
                },
              });

              await transaction.rateHistory.create({
                data: {
                  metalRateId: created.id,
                  metalType,
                  action: RateHistoryAction.CREATE,
                  newData: toSnapshot(created),
                  source: historySource,
                },
              });
              summary.created += 1;
              summary.historyEntries += 1;
              decisions.push({ rate: quote.label, decision: "UPDATED" });
            }
          }

          await transaction.systemSetting.upsert({
            where: { key: "rates.lastScraperSyncAt" },
            update: { value: attemptedAt },
            create: { key: "rates.lastScraperSyncAt", value: attemptedAt },
          });

          const changedRates = summary.created + summary.updated;
          const status =
            changedRates === 0
              ? RateUpdateStatus.NO_CHANGE
              : RateUpdateStatus.SUCCESS;
          const log = await transaction.rateUpdateLog.create({
            data: {
              source: config.name,
              sourceUrl: config.url,
              status,
              executionType: executionType as RateSyncExecutionType,
              message:
                changedRates === 0
                  ? `The ${parsed.preferredSession} source values matched the stored national rates; no records were changed.`
                  : `Synchronized ${changedRates} changed rates using the ${parsed.preferredSession} source session.`,
              changedRates,
              attemptCount,
              durationMs: Date.now() - startedAtMs,
              sourceRecordedAt: recordedAt,
              rawData: {
                executionType,
                attemptedAt,
                cronSlot: cronSlot ?? "UNSPECIFIED",
                parsed,
                sourceAttempts,
                decisions,
                database: summary,
              } as Prisma.InputJsonObject,
            },
          });

          return { summary, logId: log.id, status };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      console.info("[rate-sync] database update", {
        executionType,
        source: config.name,
        sourceUrl: config.url,
        sourceDate: parsed.sourceDate,
        preferredSession: parsed.preferredSession,
        cronSlot: cronSlot ?? "UNSPECIFIED",
        attemptCount,
        ...synchronized.summary,
        status: synchronized.status,
        logId: synchronized.logId,
      });

      return synchronized;
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new Error("The rate synchronization transaction could not be completed.");
}

function errorMessage(error: unknown) {
  if (error instanceof ScraperError) return error.message;
  return "The scraping attempt failed unexpectedly.";
}

async function recordUnsuccessfulAttempt(
  status: "FAILED" | "REJECTED",
  message: string,
  executionType: ScraperMode,
  attemptedAt: string,
  attemptCount: number,
  durationMs: number,
  config: ScraperProviderConfig | null,
  error: unknown,
  parsed?: ScrapedRateResult,
  cronSlot?: CronSlot,
  sourceAttempts: ScraperSourceAttempt[] = [],
) {
  const source = config?.name ?? process.env.RATE_SOURCE_NAME?.trim() ?? "UNCONFIGURED";
  const sourceUrl = config?.url ?? process.env.RATE_SOURCE_URL?.trim() ?? null;
  const details = error instanceof ScraperError ? error.details : undefined;

  console.error("[rate-sync] failure", {
    executionType,
    status,
    source,
    sourceUrl,
    message,
    attemptCount,
    durationMs,
    sourceDate: parsed?.sourceDate ?? null,
    cronSlot: cronSlot ?? "UNSPECIFIED",
    sourceAttempts,
    errorName: error instanceof Error ? error.name : "UnknownError",
    details,
  });

  return prisma.$transaction(async (transaction) => {
    await transaction.metalRate.updateMany({
      where: { isActive: true, deletedAt: null },
      data: {
        fallbackUsed: true,
        fallbackReason: "All enabled live rate providers failed validation.",
        validationStatus: RateValidationStatus.FALLBACK,
      },
    });
    return transaction.rateUpdateLog.create({
      data: {
      source,
      sourceUrl,
      status,
      executionType: executionType as RateSyncExecutionType,
      message,
      attemptCount,
      durationMs,
      sourceRecordedAt: parsed ? new Date(parsed.recordedAt) : null,
      rawData: {
        executionType,
        attemptedAt,
        cronSlot: cronSlot ?? "UNSPECIFIED",
        sourceAttempts,
        ...(parsed ? { parsed } : {}),
        ...(details ? { errorDetails: details } : {}),
      } as Prisma.InputJsonObject,
      },
      select: { id: true },
    });
  });
}

function isUnsupportedGoodReturnsCity(error: unknown) {
  if (error instanceof ScraperError && error.details?.status === 404) return true;
  return error instanceof ScraperRejectedError && /requested .+ city pages/i.test(error.message);
}

function emptyDatabaseSummary(): ScraperDatabaseSummary {
  return { created: 0, updated: 0, unchanged: 0, historyEntries: 0, metadataUpdated: 0 };
}

function addDatabaseSummary(target: ScraperDatabaseSummary, source: ScraperDatabaseSummary) {
  target.created += source.created;
  target.updated += source.updated;
  target.unchanged += source.unchanged;
  target.historyEntries += source.historyEntries;
  target.metadataUpdated += source.metadataUpdated;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function mappingCsv(rows: GoodReturnsMappingRow[]) {
  return [
    "RateStack City,Provider Slug,Parsed City,Status",
    ...rows.map((row) => [row.rateStackCity, row.providerSlug, row.parsedCity, row.status].map(csvCell).join(",")),
  ].join("\n");
}

async function synchronizeAllGoodReturnsCities(
  config: ScraperProviderConfig,
  mode: ScraperMode,
  attemptedAt: string,
  startedAtMs: number,
  cronSlot?: CronSlot,
) {
  const activeCities = await prisma.city.findMany({
    where: { isActive: true, deletedAt: null, state: { isActive: true } },
    select: { id: true, name: true, slug: true, state: { select: { name: true } } },
    orderBy: [{ state: { name: "asc" } }, { name: "asc" }],
  });
  const targets = activeCities.map(resolveGoodReturnsCity);
  const duplicates = duplicateGoodReturnsMappings(targets);
  const duplicateCityIds = new Set(duplicates.flatMap(({ cities }) => cities.map(({ cityId }) => cityId)));
  const report: GoodReturnsMappingReport = {
    totalActiveCities: targets.length,
    successfullyMapped: 0,
    unsupported: 0,
    failed: 0,
    duplicateMappings: duplicates.length,
    unsupportedCities: [],
    failedCities: [],
    duplicates,
    correctMappings: [],
    incorrectMappings: [],
    aliasMappings: [],
    missingMappings: [],
    first100Mismatches: [],
    csv: "",
  };
  const database = emptyDatabaseSummary();
  const parsedResults: ScrapedRateResult[] = [];
  let cursor = 0;
  const concurrency = Math.max(1, Math.min(8, Number(process.env.GOODRETURNS_CONCURRENCY ?? "4") || 4));

  const worker = async () => {
    while (cursor < targets.length) {
      const target = targets[cursor++];
      if (duplicateCityIds.has(target.cityId)) {
        report.unsupported += 1;
        report.unsupportedCities.push({ ...target, reason: "Duplicate provider slug; manual mapping required." });
        report.incorrectMappings.push({
          rateStackState: target.state, rateStackCity: target.city, providerSlug: target.providerSlug,
          parsedCity: "", status: "DUPLICATE", resolvedCityId: target.cityId,
          reason: "Duplicate provider slug; manual mapping required.",
        });
        continue;
      }
      const provider = new GoodReturnsRateProvider(config, target);
      try {
        const parsed = await provider.scrape();
        await validateChangeThreshold(provider.config, parsed);
        const diagnostics = parsed.providerDiagnostics;
        const row: GoodReturnsMappingRow = {
          rateStackState: target.state,
          rateStackCity: target.city,
          providerSlug: target.providerSlug,
          parsedCity: diagnostics?.parsedGoldCity ?? "",
          status: target.citySlug === target.providerSlug ? "CORRECT" : "ALIAS",
          resolvedCityId: target.cityId,
          finalUrl: diagnostics?.goldFinalUrl,
          title: diagnostics?.goldTitle,
          h1: diagnostics?.goldH1,
        };
        report.correctMappings.push(row);
        if (row.status === "ALIAS") report.aliasMappings.push(row);
        console.info("[rate-sync] GoodReturns city verified before save", {
          rateStackState: target.state,
          rateStackCity: target.city,
          requestedGoodReturnsSlug: target.providerSlug,
          finalUrl: diagnostics?.goldFinalUrl ?? null,
          htmlPageTitle: diagnostics?.goldTitle ?? null,
          htmlH1: diagnostics?.goldH1 ?? null,
          parsedCityName: diagnostics?.parsedGoldCity ?? null,
          resolvedCityId: target.cityId,
          savedCityId: target.cityId,
        });
        parsedResults.push(parsed);
        report.successfullyMapped += 1;
        if (mode !== "MANUAL_TEST") {
          const synchronized = await writeSynchronizedRates(
            provider.config, parsed, attemptedAt, mode, 1, startedAtMs, cronSlot, [{
              provider: provider.name,
              sourceUrl: provider.sourceUrl,
              status: "SUCCESS",
              sourceDate: parsed.sourceDate,
              sourceRecordedAt: parsed.recordedAt,
              preferredSession: parsed.preferredSession,
              attemptedAt: new Date().toISOString(),
            }],
          );
          addDatabaseSummary(database, synchronized.summary);
        }
      } catch (error) {
        const details = error instanceof ScraperError ? error.details : undefined;
        const diagnostics = details?.diagnostics as Record<string, unknown> | undefined;
        const item = {
          cityId: target.cityId,
          city: target.city,
          state: target.state,
          providerSlug: target.providerSlug,
          reason: error instanceof Error ? error.message : "Unknown provider error",
        };
        const row: GoodReturnsMappingRow = {
          rateStackState: target.state,
          rateStackCity: target.city,
          providerSlug: target.providerSlug,
          parsedCity: String(details?.parsedGoldCity ?? details?.parsedSilverCity ?? ""),
          status: details?.code === "CITY_MISMATCH"
            ? "CITY_MISMATCH"
            : isUnsupportedGoodReturnsCity(error) ? "MISSING" : "FAILED",
          resolvedCityId: target.cityId,
          finalUrl: typeof diagnostics?.goldFinalUrl === "string" ? diagnostics.goldFinalUrl : undefined,
          title: typeof diagnostics?.goldTitle === "string" ? diagnostics.goldTitle : undefined,
          h1: typeof diagnostics?.goldH1 === "string" ? diagnostics.goldH1 : undefined,
          reason: item.reason,
        };
        if (row.status === "CITY_MISMATCH") {
          report.unsupported += 1;
          report.unsupportedCities.push(item);
          report.incorrectMappings.push(row);
        } else if (row.status === "MISSING") {
          report.unsupported += 1;
          report.unsupportedCities.push(item);
          report.missingMappings.push(row);
        } else {
          report.failed += 1;
          report.failedCities.push(item);
        }
        console.warn("[rate-sync] GoodReturns city skipped", {
          ...item,
          requestedGoodReturnsSlug: target.providerSlug,
          finalUrl: row.finalUrl ?? null,
          htmlPageTitle: row.title ?? null,
          htmlH1: row.h1 ?? null,
          parsedCityName: row.parsedCity || null,
          resolvedCityId: target.cityId,
          savedCityId: null,
          errorCode: row.status,
        });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker));
  report.first100Mismatches = report.incorrectMappings.filter(({ status }) => status === "CITY_MISMATCH").slice(0, 100);
  report.csv = mappingCsv([
    ...report.correctMappings,
    ...report.incorrectMappings,
    ...report.missingMappings,
    ...report.failedCities.map((item) => ({
      rateStackState: item.state, rateStackCity: item.city, providerSlug: item.providerSlug,
      parsedCity: "", status: "FAILED" as const, resolvedCityId: item.cityId, reason: item.reason,
    })),
  ]);

  const log = await prisma.rateUpdateLog.create({
    data: {
      source: "GOODRETURNS",
      sourceUrl: process.env.GOODRETURNS_BASE_URL?.trim() || "https://www.goodreturns.in",
      status: report.failed > 0 && report.successfullyMapped === 0
        ? RateUpdateStatus.FAILED
        : database.created + database.updated > 0
          ? RateUpdateStatus.SUCCESS
          : RateUpdateStatus.NO_CHANGE,
      executionType: mode as RateSyncExecutionType,
      message: `GoodReturns city mapping completed for ${report.totalActiveCities} active cities: ${report.successfullyMapped} mapped, ${report.unsupported} unsupported, ${report.failed} failed.`,
      changedRates: database.created + database.updated,
      durationMs: Date.now() - startedAtMs,
      rawData: { mappingReport: report, database } as Prisma.InputJsonObject,
    },
    select: { id: true },
  });
  console.info("[rate-sync] GoodReturns city mapping report", report);
  return { report, database, parsed: parsedResults[0], logId: log.id };
}

export async function executeScraper(
  mode: ScraperMode,
  options: { cronSlot?: CronSlot } = {},
): Promise<ScraperExecutionResult> {
  const startedAtMs = Date.now();
  const attemptedAt = new Date().toISOString();
  let config: ScraperProviderConfig | null = null;
  let parsed: ScrapedRateResult | undefined;
  let sourceAttempts: ScraperSourceAttempt[] = [];
  let attemptCount = 1;
  const cronSlot = options.cronSlot;

  try {
    const scraperConfig = getScraperConfig();
    config = scraperConfig;
    if (!scraperConfig.enabled) {
      throw new ScraperRejectedError("The configured rate source is disabled.");
    }

    const providerOrder = logResolvedProviderOrder(`executeScraper:${mode}`);
    if (providerOrder.enabled.includes("GOODRETURNS")) {
      const lease = await acquireRateSyncLease();
      if (!lease) throw new RateSyncLockUnavailableError("Another rate synchronization is already running. This attempt was safely skipped.");
      try {
        const citySync = await synchronizeAllGoodReturnsCities(
          scraperConfig, mode, attemptedAt, startedAtMs, cronSlot,
        );
        if (citySync.report.successfullyMapped > 0) {
          return {
            ok: true,
            outcome: citySync.database.created + citySync.database.updated > 0 ? "SUCCESS" : "NO_CHANGE",
            message: `Processed ${citySync.report.totalActiveCities} active cities; ${citySync.report.successfullyMapped} GoodReturns mappings succeeded.`,
            logId: citySync.logId,
            parsed: citySync.parsed,
            database: citySync.database,
            attemptCount: 1,
            cronSlot,
            mappingReport: citySync.report,
          };
        }
      } finally {
        await releaseRateSyncLease(lease);
      }
    }
    const providers = createRateScraperProviders(
      scraperConfig,
      providerOrder.enabled.filter((provider) => provider !== "GOODRETURNS"),
    );

    if (mode === "MANUAL_TEST") {
      const prepared = await scrapeWithFallback(providers, scraperConfig.maxChangePercent);
      parsed = prepared.parsed;
      config = prepared.config;
      sourceAttempts = prepared.sourceAttempts;
      logParsedRates(mode, parsed, 1);

      const log = await prisma.rateUpdateLog.create({
        data: {
          source: prepared.config.name,
          sourceUrl: prepared.config.url,
          status: RateUpdateStatus.SUCCESS,
          executionType: RateSyncExecutionType.MANUAL_TEST,
          message: `Test scrape parsed ${parsed.quotes.length} source rates; no metal rates were changed.`,
          changedRates: 0,
          attemptCount,
          durationMs: Date.now() - startedAtMs,
          sourceRecordedAt: new Date(parsed.recordedAt),
          rawData: {
            executionType: mode,
            attemptedAt,
            cronSlot: cronSlot ?? "UNSPECIFIED",
            parsed,
            sourceAttempts,
          } as Prisma.InputJsonObject,
        },
        select: { id: true },
      });

      return {
        ok: true,
        outcome: "SUCCESS",
        message: "Live source data parsed successfully. Test mode did not update any rates.",
        logId: log.id,
        parsed,
        attemptCount,
        cronSlot,
      };
    }

    const execution = await runLockedRetryPipeline({
      leaseManager: {
        acquire: () => acquireRateSyncLease(),
        release: async (lease) => {
          try {
            await releaseRateSyncLease(lease);
          } catch (error) {
            console.error(
              "The rate-sync lease could not be released and will expire automatically.",
              error,
            );
          }
        },
      },
      prepare: async (attempt) => {
        const prepared = await scrapeWithFallback(providers, scraperConfig.maxChangePercent);
        parsed = prepared.parsed;
        config = prepared.config;
        sourceAttempts = prepared.sourceAttempts;
        logParsedRates(mode, parsed, attempt);
        return prepared;
      },
      commit: (prepared, attempts) =>
        writeSynchronizedRates(
          prepared.config,
          prepared.parsed,
          attemptedAt,
          mode,
          attempts,
          startedAtMs,
          cronSlot,
          prepared.sourceAttempts,
        ),
      maxAttempts:
        mode === "AUTOMATIC_CRON" ? scraperConfig.maxRetries + 1 : 1,
      isRetryable: (error) => !(error instanceof ScraperRejectedError),
    });

    if (!execution.acquired) {
      throw new RateSyncLockUnavailableError(
        "Another rate synchronization is already running. This attempt was safely skipped.",
      );
    }

    attemptCount = execution.attempts;
    const synchronized = execution.result;
    const noChange = synchronized.status === RateUpdateStatus.NO_CHANGE;
    if (!parsed) {
      throw new Error("The synchronization completed without parsed source data.");
    }
    return {
      ok: true,
      outcome: noChange ? "NO_CHANGE" : "SUCCESS",
      message: noChange
        ? `The latest ${parsed.preferredSession} values are already stored; no rates or history records were added.`
        : `Rate synchronization completed using ${parsed.preferredSession} values.`,
      logId: synchronized.logId,
      parsed,
      database: synchronized.summary,
      attemptCount,
      cronSlot,
    };
  } catch (error) {
    const underlyingError =
      error instanceof RetryExecutionError ? error.originalError : error;
    if (error instanceof RetryExecutionError) {
      attemptCount = error.attempts;
    }
    const status =
      underlyingError instanceof ScraperRejectedError
        ? RateUpdateStatus.REJECTED
        : RateUpdateStatus.FAILED;
    const message = errorMessage(underlyingError);
    const locked = underlyingError instanceof RateSyncLockUnavailableError;

    try {
      const log = await recordUnsuccessfulAttempt(
        status,
        message,
        mode,
        attemptedAt,
        attemptCount,
        Date.now() - startedAtMs,
        config,
        underlyingError,
        parsed,
        cronSlot,
        sourceAttempts,
      );

      return {
        ok: false,
        outcome: status,
        message,
        logId: log.id,
        parsed,
        attemptCount,
        locked,
        cronSlot,
      };
    } catch (logError) {
      console.error("The scraper attempt could not be recorded.", logError);
      return {
        ok: false,
        outcome: status,
        message: `${message} The attempt could not be saved to the API log.`,
        parsed,
        attemptCount,
        locked,
      };
    }
  }
}
