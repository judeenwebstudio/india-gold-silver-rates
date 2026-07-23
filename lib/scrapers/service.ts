import {
  MetalPurity,
  MetalType,
  Prisma,
  RateHistoryAction,
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
import { getScraperConfig } from "@/lib/scrapers/config";
import {
  RateSyncLockUnavailableError,
  ScraperError,
  ScraperRejectedError,
} from "@/lib/scrapers/errors";
import { createRateScraperProvider } from "@/lib/scrapers/registry";
import type {
  NormalizedSessionRate,
  ScrapedRateQuote,
  ScrapedRateResult,
  ScraperMappedPurity,
  ScraperMetalType,
  ScraperProviderConfig,
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

    return [{ quote, selected, purity: quote.mappedPurity }];
  });
}

async function validateChangeThreshold(
  config: ScraperProviderConfig,
  result: ScrapedRateResult,
) {
  const selectedRates = selectedMappedRates(result);
  const violations: Array<Record<string, unknown>> = [];
  const stale: string[] = [];

  await Promise.all(
    selectedRates.map(async ({ quote, selected, purity }) => {
      const baseline = await prisma.metalRate.findFirst({
        where: {
          source: config.name,
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
      if (incomingRecordedAt.getTime() < baseline.recordedAt.getTime()) {
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
) {
  const rates = selectedMappedRates(parsed);
  const recordedAt = new Date(parsed.recordedAt);
  const historySource = `SCRAPER:${config.name}:${executionType}`;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const summary: ScraperDatabaseSummary = {
            created: 0,
            updated: 0,
            unchanged: 0,
            historyEntries: 0,
          };

          for (const { quote, selected, purity } of rates) {
            const metalType = toMetalType(quote.metalType);
            const existing = await transaction.metalRate.findFirst({
              where: {
                source: config.name,
                cityId: null,
                isActive: true,
                metalType,
                purity: purity as MetalPurity,
              },
              orderBy: [{ recordedAt: "desc" }, { updatedAt: "desc" }],
            });

            const pricePerKilogram = selected.pricePerKilogram;
            const valuesUnchanged =
              existing &&
              rateValuesAreEqual(existing, {
                pricePerGram: selected.pricePerGram,
                pricePerKilogram,
              });

            if (valuesUnchanged) {
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
            } else {
              const created = await transaction.metalRate.create({
                data: {
                  metalType,
                  purity: purity as MetalPurity,
                  pricePerGram: selected.pricePerGram,
                  pricePerKilogram,
                  cityId: null,
                  source: config.name,
                  recordedAt,
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
                parsed,
                database: summary,
              } as Prisma.InputJsonObject,
            },
          });

          return { summary, logId: log.id, status };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (attempt < 2 && isRetryableTransactionError(error)) continue;
      throw error;
    }
  }

  throw new Error("The rate synchronization transaction could not be completed.");
}

function errorMessage(error: unknown) {
  if (error instanceof ScraperError) return error.message;
  console.error("Scraper execution failed.", error);
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
) {
  const source = config?.name ?? process.env.RATE_SOURCE_NAME?.trim() ?? "UNCONFIGURED";
  const sourceUrl = config?.url ?? process.env.RATE_SOURCE_URL?.trim() ?? null;
  const details = error instanceof ScraperError ? error.details : undefined;

  return prisma.rateUpdateLog.create({
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
        ...(parsed ? { parsed } : {}),
        ...(details ? { errorDetails: details } : {}),
      } as Prisma.InputJsonObject,
    },
    select: { id: true },
  });
}

export async function executeScraper(mode: ScraperMode): Promise<ScraperExecutionResult> {
  const startedAtMs = Date.now();
  const attemptedAt = new Date().toISOString();
  let config: ScraperProviderConfig | null = null;
  let parsed: ScrapedRateResult | undefined;
  let attemptCount = 1;

  try {
    const scraperConfig = getScraperConfig();
    config = scraperConfig;
    if (!scraperConfig.enabled) {
      throw new ScraperRejectedError("The configured rate source is disabled.");
    }

    const provider = createRateScraperProvider(scraperConfig);

    if (mode === "MANUAL_TEST") {
      parsed = await provider.scrape();
      await validateChangeThreshold(scraperConfig, parsed);

      const log = await prisma.rateUpdateLog.create({
        data: {
          source: scraperConfig.name,
          sourceUrl: scraperConfig.url,
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
            parsed,
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
      prepare: async () => {
        parsed = await provider.scrape();
        await validateChangeThreshold(scraperConfig, parsed);
        return parsed;
      },
      commit: (prepared, attempts) =>
        writeSynchronizedRates(
          scraperConfig,
          prepared,
          attemptedAt,
          mode,
          attempts,
          startedAtMs,
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
      );

      return {
        ok: false,
        outcome: status,
        message,
        logId: log.id,
        parsed,
        attemptCount,
        locked,
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
