import {
  RateSyncExecutionType,
  RateUpdateStatus,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getScraperConfig } from "@/lib/scrapers/config";

export const RATE_SYNC_CRON_SCHEDULE_UTC = "0 13 * * *";
export const RATE_SYNC_CRON_LABEL_UTC = "Daily at 1:00 PM UTC";
export const RATE_SYNC_CRON_LABEL_IST = "Daily at 6:30 PM IST";

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
    sourceEnabled = scraper.enabled;
    sourceName = scraper.name;
  } catch {
    sourceEnabled = false;
  }

  return {
    enabled: Boolean(process.env.CRON_SECRET) && sourceEnabled,
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
