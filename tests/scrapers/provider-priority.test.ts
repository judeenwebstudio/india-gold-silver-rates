import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { scrapeWithFallback } from "../../lib/scrapers/service";
import type { RateScraperProvider, ScrapedRateResult, ScraperProviderConfig } from "../../lib/scrapers/types";
import { getResolvedProviderOrder } from "../../lib/scrapers/config";
import { createRateScraperProviders } from "../../lib/scrapers/registry";

const config = (name: string): ScraperProviderConfig => ({
  name, url: `https://${name.toLowerCase()}.example/`, enabled: true,
  maxChangePercent: 20, userAgent: "RateStack test agent", requestTimeoutMs: 1000, maxRetries: 0,
});
const result = (provider: string): ScrapedRateResult => ({
  provider, sourceUrl: `https://${provider}.example/`, sourceDate: "2026-07-29",
  sourceTime: "10:00 IST", recordedAt: "2026-07-29T04:30:00.000Z",
  fetchedAt: "2026-07-29T04:31:00.000Z", preferredSession: "AM",
  quotes: [
    { code: "GOLD_999", label: "24K", metalType: "GOLD", sourcePurity: "999", sourceUnit: "PER_GRAM", mappedPurity: "K24", am: { sourceValue: "100", pricePerGram: "100", pricePerKilogram: null }, pm: null },
    { code: "GOLD_916", label: "22K", metalType: "GOLD", sourcePurity: "916", sourceUnit: "PER_GRAM", mappedPurity: "K22", am: { sourceValue: "90", pricePerGram: "90", pricePerKilogram: null }, pm: null },
    { code: "SILVER_999", label: "Silver", metalType: "SILVER", sourcePurity: "999", sourceUnit: "PER_GRAM", mappedPurity: "P999", am: { sourceValue: "2", pricePerGram: "2", pricePerKilogram: "2000" }, pm: null },
  ],
});
const provider = (name: string, scrape: () => Promise<ScrapedRateResult>): RateScraperProvider => ({
  name, sourceUrl: config(name).url, config: config(name), scrape,
});

test("valid GoodReturns prevents an unnecessary IBJA request", async () => {
  let ibjaCalls = 0;
  const selected = await scrapeWithFallback([
    provider("GOODRETURNS", async () => result("GOODRETURNS")),
    provider("IBJA", async () => { ibjaCalls += 1; return result("IBJA"); }),
  ], 20, async () => {});
  assert.equal(selected.config.name, "GOODRETURNS");
  assert.equal(ibjaCalls, 0);
});

test("runtime reads and resolves the three provider environment variables", () => {
  const resolved = getResolvedProviderOrder({
    RATE_PRIMARY_PROVIDER: "GOODRETURNS",
    RATE_SECONDARY_PROVIDER: "IBJA",
    RATE_TERTIARY_PROVIDER: "BANKBAZAAR",
    BANKBAZAAR_ENABLED: "false",
    BANKBAZAAR_AUTHORISED: "false",
  });
  assert.deepEqual(resolved.requested, ["GOODRETURNS", "IBJA", "BANKBAZAAR"]);
  assert.deepEqual(resolved.enabled, ["GOODRETURNS", "IBJA"]);
  assert.equal(resolved.disabled[0]?.provider, "BANKBAZAAR");
  assert.deepEqual(
    createRateScraperProviders(config("IBJA"), resolved.enabled).map((item) => item.name),
    ["GOODRETURNS", "IBJA"],
  );
});

test("configured provider order is respected instead of hardcoded", () => {
  const resolved = getResolvedProviderOrder({
    RATE_PRIMARY_PROVIDER: "IBJA",
    RATE_SECONDARY_PROVIDER: "GOODRETURNS",
    RATE_TERTIARY_PROVIDER: "BANKBAZAAR",
  });
  assert.deepEqual(resolved.enabled, ["IBJA", "GOODRETURNS"]);
  assert.deepEqual(
    createRateScraperProviders(config("IBJA"), resolved.enabled).map((item) => item.name),
    ["IBJA", "GOODRETURNS"],
  );
});

test("IBJA is selected only after GoodReturns fails", async () => {
  const selected = await scrapeWithFallback([
    provider("GOODRETURNS", async () => { throw new Error("unavailable"); }),
    provider("IBJA", async () => result("IBJA")),
  ], 20, async () => {});
  assert.equal(selected.config.name, "IBJA");
  assert.deepEqual(selected.sourceAttempts.map((attempt) => attempt.status), ["FAILED", "SUCCESS"]);
});

test("BankBazaar and MCX are disabled by default and MCX is separate from retail pricing", () => {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.example"), "utf8");
  const shop = fs.readFileSync(path.join(process.cwd(), "lib/shop.ts"), "utf8");
  assert.match(env, /BANKBAZAAR_ENABLED="false"/);
  assert.match(env, /BANKBAZAAR_AUTHORISED="false"/);
  assert.match(env, /MCX_ENABLED="false"/);
  assert.doesNotMatch(shop, /MCX/);
});

test("customer surfaces do not claim a government or BIS price source", () => {
  const files = [
    "lib/api/v1/service.ts",
    "lib/shop.ts",
    "android-ratestack/app/src/main/java/com/ratestack/app/ui/components/MarketDataSections.kt",
    "android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/NativeShopScreen.kt",
  ].map(read => fs.readFileSync(path.join(process.cwd(), read), "utf8")).join("\n");
  assert.doesNotMatch(files, /Official Government Rate|Government Approved Rate|Government Gold Rate|BIS Approved Rate|Official Trichy Government Rate/i);
});
