import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { MetalPurity, MetalType } from "../generated/prisma/client";
import { historySelection, historySummary, selectDailyHistory, type PublicHistoryRecord } from "../lib/rate-history";
import { sortCityRecords, type CityComparisonRecord } from "../lib/city-rate-comparison";

const history = (date: string, rate: number, session: "AM" | "PM", official = true): PublicHistoryRecord => ({
  date, rate, rateDate: date, sourcePublishedAt: `${date}T${session === "PM" ? "12:30" : "06:30"}:00.000Z`,
  city: "Tiruchirappalli", sourceName: "IBJA", sourceReference: "SCRAPER:IBJA:test",
  sourceSession: session, isOfficial: official, rateType: "INDICATIVE", recordedAt: `${date}T13:00:00.000Z`,
});

test("history chooses official PM over AM and does not fabricate missing dates", () => {
  const records = selectDailyHistory([
    history("2026-07-22", 100, "AM"),
    history("2026-07-22", 110, "PM"),
    history("2026-07-24", 130, "AM"),
  ], 7);
  assert.deepEqual(records.map((record) => [record.date, record.rate]), [["2026-07-22", 110], ["2026-07-24", 130]]);
});

test("history summary uses the first and last real observations", () => {
  assert.deepEqual(historySummary([history("2026-07-22", 100, "PM"), history("2026-07-24", 125, "PM")]), {
    current: 125, previous: 100, change: 25, changePercent: 25, high: 125, low: 100,
  });
});

test("city history maps K22, K24 and Silver to their exact stored rate identities", () => {
  assert.deepEqual(historySelection("gold22k"), { metalType: MetalType.GOLD, purity: MetalPurity.K22 });
  assert.deepEqual(historySelection("gold24k"), { metalType: MetalType.GOLD, purity: MetalPurity.K24 });
  assert.deepEqual(historySelection("silver"), { metalType: MetalType.SILVER, purity: MetalPurity.P999 });
});

test("one-day and no-history states preserve only available observations", () => {
  const oneDay = selectDailyHistory([history("2026-08-01", 13220, "AM")], 7);
  assert.equal(oneDay.length, 1);
  assert.equal(historySummary(oneDay)?.previous, null);
  assert.deepEqual(selectDailyHistory([], 7), []);
  assert.equal(historySummary([]), null);
});

test("city history query filters GoodReturns provider, sessions, status and city", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "lib/rate-history.ts"), "utf8");
  assert.match(source, /cityId: city\.id/);
  assert.match(source, /provider: RateProvider\.GOODRETURNS/);
  assert.match(source, /sourceSession: \{ in: \["AM", "PM"\] \}/);
  assert.match(source, /isActive: true/);
  assert.match(source, /deletedAt: null/);
  assert.match(source, /recordedAt: \{ gte: rangeStart \}/);
  assert.doesNotMatch(source, /data\.cityId != null/);
  assert.doesNotMatch(source, /SCRAPER:IBJA:/);
});

test("history UI explains one-day and no-history collection states", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "components/HistoricalChart.tsx"), "utf8");
  assert.match(source, /History will build as daily rates are collected/);
  assert.match(source, /prices from stored \{data\?\.providerName/);
  assert.doesNotMatch(source, /derived from stored IBJA publications/);
});

const city = (name: string, value: number | null): CityComparisonRecord => ({
  rank: 0, city: name, citySlug: name.toLowerCase(), state: "Tamil Nadu", stateSlug: "tamil-nadu",
  gold24kPerGram: value, gold22kPerGram: value, silverPerGram: value, silverPerKg: value,
  rateDate: "2026-07-28", sourceName: "IBJA", sourcePublishedAt: "2026-07-28T12:30:00.000Z",
  rateType: "INDICATIVE", verificationStatus: "CALCULATED",
  sourceReference: "IBJA national base + configured city adjustment",
  adjustment: { gold24k: 0, gold22k: 0, silverPerGram: 0 }, stale: false,
});

test("city ranking sorts numerically and keeps missing rates last", () => {
  assert.deepEqual(sortCityRecords([city("High", 1000), city("Missing", null), city("Low", 900)], "gold22k").map((item) => item.city), ["Low", "High", "Missing"]);
});

test("city records preserve indicative provenance", () => {
  const record = city("Trichy", 900);
  assert.equal(record.rateType, "INDICATIVE");
  assert.equal(record.verificationStatus, "CALCULATED");
  assert.match(record.sourceReference, /national base.*adjustment/i);
});
