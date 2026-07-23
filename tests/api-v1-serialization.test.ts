import assert from "node:assert/strict";
import test from "node:test";

import {
  serializeCityRates,
  serializeNationalRates,
} from "../lib/api/v1/service";
import { validateLocationSlugs } from "../lib/api/v1/validation";
import type { DisplayRate, PublicRateSnapshot } from "../lib/public-rate-types";

function rate(
  id: DisplayRate["id"],
  price: number,
): DisplayRate {
  return {
    id,
    label: id,
    shortLabel: id,
    purity: id,
    unit: id === "silver-kg" ? "per kilogram" : "per gram",
    metal: id.startsWith("gold") ? "gold" : "silver",
    price,
    basePrice: price,
    adjustment: 0,
    previousPrice: price - 10,
    change: 10,
    changePercent: 0.1,
  };
}

const snapshot: PublicRateSnapshot = {
  location: {
    cityId: "city-id",
    cityName: "Chennai",
    citySlug: "chennai",
    stateId: "state-id",
    stateName: "Tamil Nadu",
    stateSlug: "tamil-nadu",
  },
  rates: [
    rate("gold-24k", 10_000),
    rate("gold-22k", 9_200),
    rate("gold-18k", 7_500),
    rate("gold-14k", 5_900),
    rate("silver-gram", 120),
    rate("silver-kg", 120_000),
  ],
  source: "IBJA",
  sourceTimestamp: "2026-07-23T12:00:00.000Z",
  lastUpdatedAt: "2026-07-23T12:05:00.000Z",
  indicative: true,
};

test("v1 national serializer returns requested gold and silver fields", () => {
  const result = serializeNationalRates(snapshot);

  assert.deepEqual(
    result.latestGoldRates.map((item) => item.purity),
    ["24K", "22K", "18K"],
  );
  assert.equal(result.latestSilverRate.pricePerGram, 120);
  assert.equal(result.latestSilverRate.pricePerKilogram, 120_000);
  assert.equal(result.lastUpdated, snapshot.lastUpdatedAt);
});

test("v1 city serializer preserves the state and city route identity", () => {
  const result = serializeCityRates(snapshot);

  assert.deepEqual(result.state, {
    name: "Tamil Nadu",
    slug: "tamil-nadu",
  });
  assert.deepEqual(result.city, { name: "Chennai", slug: "chennai" });
  assert.equal(result.goldRates[0]?.pricePerGram, 10_000);
  assert.equal(result.silverRate.pricePerGram, 120);
});

test("v1 route validation rejects malformed location slugs", () => {
  assert.equal(validateLocationSlugs("tamil-nadu", "chennai").success, true);
  assert.equal(validateLocationSlugs("Tamil Nadu", "chennai").success, false);
  assert.equal(validateLocationSlugs("tamil-nadu", "../chennai").success, false);
});
