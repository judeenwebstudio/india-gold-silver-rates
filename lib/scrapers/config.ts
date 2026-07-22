import { z } from "zod";

import { ScraperConfigurationError } from "@/lib/scrapers/errors";
import type { ScraperProviderConfig } from "@/lib/scrapers/types";

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
});

export function getScraperConfig(): ScraperProviderConfig {
  const result = configSchema.safeParse({
    name: process.env.RATE_SOURCE_NAME,
    url: process.env.RATE_SOURCE_URL,
    enabled: process.env.RATE_SOURCE_ENABLED,
    maxChangePercent: process.env.SCRAPER_MAX_CHANGE_PERCENT,
    userAgent: process.env.SCRAPER_USER_AGENT,
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
