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
  return handleRateSyncCron(request, {
    secret: process.env.CRON_SECRET,
    execute: async () => {
      const result = await executeScraper("AUTOMATIC_CRON");
      revalidateRatePages();
      return result;
    },
  });
}
