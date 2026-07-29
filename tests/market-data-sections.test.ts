import assert from "node:assert/strict";
import test from "node:test";
import { historySummary, selectDailyHistory, type PublicHistoryRecord } from "../lib/rate-history";
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
