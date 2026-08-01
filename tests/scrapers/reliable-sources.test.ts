import assert from "node:assert/strict";
import test from "node:test";

import { ScraperFetchError, ScraperRejectedError } from "../../lib/scrapers/errors";
import { parseIbjaCoRates } from "../../lib/scrapers/providers/ibja-co-parser";
import { scrapeWithFallback } from "../../lib/scrapers/service";
import {
  assertCrossSourceVariance,
  assertSourceTimestampNotOlder,
  assertValidScrapedResult,
} from "../../lib/scrapers/validation";
import type {
  RateScraperProvider,
  ScrapedRateResult,
  ScraperProviderConfig,
} from "../../lib/scrapers/types";

const config = (name: string, url: string): ScraperProviderConfig => ({
  name,
  url,
  enabled: true,
  maxChangePercent: 20,
  userAgent: "RateStack test agent",
  requestTimeoutMs: 15_000,
  maxRetries: 2,
});

const fallbackHtml = `
  <span id="lblHeaderTextForTimeUnit">IBJA AM</span>
  <span id="lblDate">27/07/2026</span>
  <span id="lblFineGold999">? 14453</span>
  <span id="lblSellingPriceFor22KT">? 13239</span>
  <span id="lblSilver999">224.771</span>
`;

function fallbackResult(): ScrapedRateResult {
  return parseIbjaCoRates(fallbackHtml, {
    provider: "IBJA_CO",
    sourceUrl: "https://ibja.co/",
    fetchedAt: "2026-07-27T06:31:00.000Z",
  });
}

function provider(providerConfig: ScraperProviderConfig, scrape: () => Promise<ScrapedRateResult>): RateScraperProvider {
  return {
    name: providerConfig.name,
    sourceUrl: providerConfig.url,
    config: providerConfig,
    scrape,
  };
}

test("primary IBJA success is selected before fallback", async () => {
  const primary = fallbackResult();
  primary.provider = "IBJA";
  const selected = await scrapeWithFallback(
    [
      provider(config("IBJA", "https://www.ibjarates.com/"), async () => primary),
      provider(config("IBJA_CO", "https://ibja.co/"), async () => fallbackResult()),
    ],
    20,
    async () => undefined,
  );

  assert.equal(selected.config.name, "IBJA");
  assert.equal(selected.sourceAttempts.length, 1);
});

test("primary failure falls back to valid official IBJA.co data", async () => {
  const selected = await scrapeWithFallback(
    [
      provider(config("IBJA", "https://www.ibjarates.com/"), async () => {
        throw new ScraperFetchError("Primary unavailable");
      }),
      provider(config("IBJA_CO", "https://ibja.co/"), async () => fallbackResult()),
    ],
    20,
    async () => undefined,
  );

  assert.equal(selected.config.name, "IBJA_CO");
  assert.equal(selected.parsed.quotes.find((quote) => quote.mappedPurity === "K24")?.am.pricePerGram, "14453.0000");
  assert.deepEqual(selected.sourceAttempts.map((attempt) => attempt.status), ["FAILED", "SUCCESS"]);
});

test("all sources failing is non-destructive", async () => {
  await assert.rejects(
    () => scrapeWithFallback(
      [
        provider(config("IBJA", "https://www.ibjarates.com/"), async () => {
          throw new ScraperFetchError("Primary unavailable");
        }),
        provider(config("IBJA_CO", "https://ibja.co/"), async () => {
          throw new ScraperRejectedError("Fallback incomplete");
        }),
      ],
      20,
      async () => undefined,
    ),
    ScraperFetchError,
  );
});

test("per-gram fallback values are not converted twice", () => {
  const result = fallbackResult();
  assert.equal(result.quotes.find((quote) => quote.code === "GOLD_999")?.am.pricePerGram, "14453.0000");
  assert.equal(result.quotes.find((quote) => quote.code === "SILVER_999")?.am.pricePerGram, "224.7710");
});

test("future timestamps and abnormal cross-source variance are rejected", () => {
  const result = fallbackResult();
  assert.throws(
    () => assertValidScrapedResult({ ...result, recordedAt: "2999-01-01T00:00:00.000Z" }),
    ScraperRejectedError,
  );

  const abnormal = structuredClone(result);
  abnormal.quotes[0]!.am.pricePerGram = "999999.0000";
  assert.throws(
    () => assertCrossSourceVariance(result, abnormal, 20),
    ScraperRejectedError,
  );
  assert.throws(
    () => assertSourceTimestampNotOlder("2026-07-26T12:00:00.000Z", "2026-07-27T12:00:00.000Z"),
    ScraperRejectedError,
  );
});

test("GoodReturns current IST date is accepted before its nominal publication time", () => {
  const result = {
    ...fallbackResult(),
    sourceDate: "2026-07-31",
    sourceTime: "10:00 IST",
    recordedAt: "2026-07-31T04:30:00.000Z",
    fetchedAt: "2026-07-30T23:45:00.000Z",
  };
  assert.doesNotThrow(() => assertValidScrapedResult(result, Date.parse("2026-07-30T23:45:00.000Z")));
  assert.doesNotThrow(() => assertValidScrapedResult(result, Date.parse("2026-07-31T05:00:00.000Z")));
});

test("a genuinely future IST calendar date remains rejected", () => {
  const result = {
    ...fallbackResult(), sourceDate: "2026-08-01", sourceTime: "10:00 IST",
    recordedAt: "2026-08-01T04:30:00.000Z", fetchedAt: "2026-07-31T03:00:00.000Z",
  };
  assert.throws(
    () => assertValidScrapedResult(result, Date.parse("2026-07-31T03:00:00.000Z")),
    /future/i,
  );
});
