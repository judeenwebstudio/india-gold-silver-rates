import {
  RateSyncExecutionType,
  RateUpdateStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getResolvedProviderOrder,
  getScraperConfig,
} from "@/lib/scrapers/config";

export const RATE_SYNC_CRON_SCHEDULE_UTC = "30 4 * * *, 30 8 * * *, 30 12 * * *";
export const RATE_SYNC_CRON_LABEL_UTC = "Daily at 04:30, 08:30, and 12:30 UTC";
export const RATE_SYNC_CRON_LABEL_IST = "Daily at 10:00 AM, 2:00 PM, and 6:00 PM IST";

export async function getSchedulerStatus() {
  const successfulStatuses = [
    RateUpdateStatus.SUCCESS,
    RateUpdateStatus.NO_CHANGE,
  ];
  const failedStatuses = [
    RateUpdateStatus.FAILED,
    RateUpdateStatus.REJECTED,
  ];

  const [lastAttempt, lastSuccessfulSync, lastFailedSync] = await Promise.all([
    prisma.rateUpdateLog.findFirst({
      where: { executionType: RateSyncExecutionType.AUTOMATIC_CRON },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rateUpdateLog.findFirst({
      where: {
        executionType: RateSyncExecutionType.AUTOMATIC_CRON,
        status: { in: successfulStatuses },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rateUpdateLog.findFirst({
      where: {
        executionType: RateSyncExecutionType.AUTOMATIC_CRON,
        status: { in: failedStatuses },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const consecutiveFailures = await prisma.rateUpdateLog.count({
    where: {
      executionType: RateSyncExecutionType.AUTOMATIC_CRON,
      status: { in: failedStatuses },
      ...(lastSuccessfulSync
        ? { createdAt: { gt: lastSuccessfulSync.createdAt } }
        : {}),
    },
  });

  let sourceEnabled = false;
  let sourceName =
    lastAttempt?.source ?? process.env.RATE_SOURCE_NAME?.trim() ?? "Unconfigured";

  try {
    const scraper = getScraperConfig();
    const providerOrder = getResolvedProviderOrder();
    sourceEnabled = scraper.enabled;
    sourceName = providerOrder.enabled.join(" → ") || scraper.name;
  } catch {
    sourceEnabled = false;
  }

  return {
    enabled:
      process.env.VERCEL_CRON_ENABLED === "true" &&
      Boolean(process.env.CRON_SECRET) &&
      sourceEnabled,
    scheduleUtc: RATE_SYNC_CRON_SCHEDULE_UTC,
    scheduleLabelUtc: RATE_SYNC_CRON_LABEL_UTC,
    scheduleLabelIst: RATE_SYNC_CRON_LABEL_IST,
    configuredTimezone: process.env.RATE_SYNC_TIMEZONE?.trim() || "Asia/Kolkata",
    lastAttempt,
    lastSuccessfulSync,
    lastFailedSync,
    lastResult: lastAttempt?.status ?? null,
    sourceName,
    changedRates: lastAttempt?.changedRates ?? 0,
    consecutiveFailures,
  };
}
