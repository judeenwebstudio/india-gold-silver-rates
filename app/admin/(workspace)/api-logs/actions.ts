"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  executeScraper,
  type ScraperDatabaseSummary,
} from "@/lib/scrapers/service";
import type { ScrapedRateResult } from "@/lib/scrapers/types";

export type ScraperActionState = {
  status: "idle" | "success" | "error";
  outcome?: "SUCCESS" | "FAILED" | "REJECTED";
  message: string;
  parsed?: ScrapedRateResult;
  database?: ScraperDatabaseSummary;
};

async function requireAdministrator(): Promise<ScraperActionState | null> {
  const session = await auth();

  if (!session?.user?.email) {
    return {
      status: "error",
      outcome: "REJECTED",
      message: "Your administrator session has expired. Sign in and try again.",
    };
  }

  return null;
}

function toActionState(
  result: Awaited<ReturnType<typeof executeScraper>>,
): ScraperActionState {
  return {
    status: result.ok ? "success" : "error",
    outcome: result.outcome,
    message: result.message,
    parsed: result.parsed,
    database: result.database,
  };
}

export async function testScraperAction(
  _previousState: ScraperActionState,
  _formData: FormData,
): Promise<ScraperActionState> {
  void _previousState;
  void _formData;
  const sessionError = await requireAdministrator();
  if (sessionError) return sessionError;

  const result = await executeScraper("TEST");
  revalidatePath("/admin/api-logs");
  return toActionState(result);
}

export async function syncRatesAction(
  _previousState: ScraperActionState,
  _formData: FormData,
): Promise<ScraperActionState> {
  void _previousState;
  void _formData;
  const sessionError = await requireAdministrator();
  if (sessionError) return sessionError;

  const result = await executeScraper("SYNC");
  revalidatePath("/admin/api-logs");

  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/admin/dashboard");
    revalidatePath("/admin/gold-rates");
    revalidatePath("/admin/silver-rates");
    revalidatePath("/api/rates/national");
    revalidatePath("/api/rates/city/[slug]", "page");
  }

  return toActionState(result);
}
