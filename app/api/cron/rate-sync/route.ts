import { revalidatePath } from "next/cache";

import { handleRateSyncCron } from "@/lib/scheduler/cron-handler";
import { executeScraper } from "@/lib/scrapers/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function revalidateRatePages() {
  revalidatePath("/");
  revalidatePath("/admin/api-logs");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/gold-rates");
  revalidatePath("/admin/silver-rates");
  revalidatePath("/api/rates/national");
  revalidatePath("/api/rates/city/[slug]", "page");
}

export async function GET(request: Request) {
  const executionTime = new Date().toISOString();
  const startedAt = Date.now();

  console.info("[rate-sync-cron] execution started", {
    executionTime,
    scheduleUtc: "0 13 * * *",
    timezone: process.env.RATE_SYNC_TIMEZONE ?? "Asia/Kolkata",
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    sourceConfigured: Boolean(process.env.RATE_SOURCE_NAME),
    sourceUrlConfigured: Boolean(process.env.RATE_SOURCE_URL),
    sourceEnabled: process.env.RATE_SOURCE_ENABLED ?? null,
  });

  return handleRateSyncCron(request, {
    secret: process.env.CRON_SECRET,
    execute: async () => {
      try {
        const result = await executeScraper("AUTOMATIC_CRON");
        console.info("[rate-sync-cron] database update result", {
          executionTime,
          durationMs: Date.now() - startedAt,
          outcome: result.outcome,
          message: result.message,
          attemptCount: result.attemptCount ?? 0,
          database: result.database ?? null,
          sourceDate: result.parsed?.sourceDate ?? null,
          preferredSession: result.parsed?.preferredSession ?? null,
          parsedRates:
            result.parsed?.quotes
              .filter((quote) => quote.mappedPurity)
              .map((quote) => ({
                label: quote.label,
                purity: quote.mappedPurity,
                pricePerGram:
                  (result.parsed?.preferredSession === "PM"
                    ? quote.pm
                    : quote.am
                  )?.pricePerGram ?? null,
              })) ?? [],
        });

        if (result.ok) revalidateRatePages();
        return result;
      } catch (error) {
        console.error("[rate-sync-cron] failure", {
          executionTime,
          durationMs: Date.now() - startedAt,
          reason: error instanceof Error ? error.message : "Unknown error",
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        throw error;
      }
    },
  });
}
