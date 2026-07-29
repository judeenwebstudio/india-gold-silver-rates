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

  await Promise.all(
    selectedRates.map(async ({ quote, selected, purity }) => {
      const baseline = await prisma.metalRate.findFirst({
        where: {
          cityId: null,
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
    console.info("[rate-sync] source attempted", {
      provider: provider.name,
      sourceUrl: provider.sourceUrl,
      attemptedAt,
    });

    try {
      const parsed = await provider.scrape();
      parsedForAttempt = parsed;
      assertValidScrapedResult(parsed);
      parsedValidated = true;

      if (validPrimary) {
        assertCrossSourceVariance(validPrimary.parsed, parsed, maxChangePercent);
      }

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
        reason: error instanceof Error ? error.message : "Unknown source failure",
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
          const sourceCity = provider === RateProvider.GOODRETURNS
            ? await transaction.city.findFirst({ where: { slug: "tiruchirappalli", state: { code: "TN" } }, select: { id: true } })
            : null;
          if (provider === RateProvider.GOODRETURNS && !sourceCity) {
            throw new ScraperRejectedError("The configured Tiruchirappalli city record is unavailable.");
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
                cityId: sourceCity?.id ?? null,
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
                  cityId: sourceCity?.id ?? null,
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
    const providers = createRateScraperProviders(scraperConfig, providerOrder.enabled);

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
