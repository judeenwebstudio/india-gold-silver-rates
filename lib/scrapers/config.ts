import { z } from "zod";

import { ScraperConfigurationError } from "@/lib/scrapers/errors";
import type { ScraperProviderConfig } from "@/lib/scrapers/types";

export type ConfiguredRateProvider = "GOODRETURNS" | "IBJA" | "BANKBAZAAR";
export type ResolvedProviderOrder = {
  requested: ConfiguredRateProvider[];
  enabled: ConfiguredRateProvider[];
  disabled: Array<{ provider: ConfiguredRateProvider; reason: string }>;
};

const providerNameSchema = z.enum(["GOODRETURNS", "IBJA", "BANKBAZAAR"]);

const configSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: z
    .string()
    .trim()
    .url()
    .refine((value) => new URL(value).protocol === "https:", {
      message: "The rate source URL must use HTTPS.",
    }),
  enabled: z.enum(["true", "false"]).transform((value) => value === "true"),
  maxChangePercent: z.coerce.number().positive().max(100),
  userAgent: z
    .string()
    .trim()
    .min(10)
    .max(240)
    .refine((value) => !/[\r\n]/.test(value), {
      message: "The scraper user agent cannot contain line breaks.",
    }),
  requestTimeoutMs: z.coerce.number().int().min(1_000).max(30_000),
  maxRetries: z.coerce.number().int().min(0).max(2),
});

export function getScraperConfig(): ScraperProviderConfig {
  const result = configSchema.safeParse({
    name: process.env.RATE_SOURCE_NAME,
    url: process.env.RATE_SOURCE_URL,
    enabled: process.env.RATE_SOURCE_ENABLED,
    maxChangePercent: process.env.RATE_MAX_VARIANCE_PERCENT ?? process.env.SCRAPER_MAX_CHANGE_PERCENT,
    userAgent: process.env.SCRAPER_USER_AGENT,
    requestTimeoutMs: process.env.SCRAPER_REQUEST_TIMEOUT_MS ?? "15000",
    maxRetries: process.env.SCRAPER_MAX_RETRIES ?? "2",
  });

  if (!result.success) {
    throw new ScraperConfigurationError(
      "The scraper environment configuration is incomplete or invalid.",
      {
        fields: result.error.issues.map(({ path, message }) => ({
          field: path.join("."),
          message,
        })),
      },
    );
  }

  return result.data;
}

function enabledFlag(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

export function getResolvedProviderOrder(
  env: Record<string, string | undefined> = process.env,
): ResolvedProviderOrder {
  const raw = [
    env.RATE_PRIMARY_PROVIDER ?? "GOODRETURNS",
    env.RATE_SECONDARY_PROVIDER ?? "IBJA",
    env.RATE_TERTIARY_PROVIDER ?? "BANKBAZAAR",
  ];
  const parsed = raw.map((value) => providerNameSchema.safeParse(value.trim().toUpperCase()));
  const invalid = parsed.flatMap((result, index) =>
    result.success ? [] : [{ position: index + 1, value: raw[index] }]);
  if (invalid.length > 0) {
    throw new ScraperConfigurationError("The configured provider priority contains an unsupported provider.", { invalid });
  }
  const requested = [...new Set(parsed.flatMap((result) => result.success ? [result.data] : []))];
  const bankBazaarEnabled = enabledFlag(env.BANKBAZAAR_ENABLED);
  const bankBazaarAuthorised = enabledFlag(env.BANKBAZAAR_AUTHORISED);
  const disabled: ResolvedProviderOrder["disabled"] = [];
  const enabled = requested.filter((provider) => {
    if (provider === "GOODRETURNS" && env.GOODRETURNS_ENABLED?.trim().toLowerCase() === "false") {
      disabled.push({ provider, reason: "GoodReturns is disabled." });
      return false;
    }
    if (provider !== "BANKBAZAAR") return true;
    if (!bankBazaarEnabled || !bankBazaarAuthorised) {
      disabled.push({
        provider,
        reason: !bankBazaarAuthorised
          ? "Authorised BankBazaar source access is not configured."
          : "BankBazaar is disabled.",
      });
      return false;
    }
    throw new ScraperConfigurationError(
      "BankBazaar is marked enabled and authorised, but no licensed provider adapter is configured.",
    );
  });
  return { requested, enabled, disabled };
}

export function logResolvedProviderOrder(
  context: string,
  resolved = getResolvedProviderOrder(),
) {
  console.info("[rate-source] resolved provider order", {
    context,
    requestedOrder: resolved.requested,
    enabledOrder: resolved.enabled,
    disabledProviders: resolved.disabled,
    finalFallback: "PREVIOUS_VERIFIED_RATE",
    mcxSeparateBenchmark: true,
  });
  return resolved;
}
