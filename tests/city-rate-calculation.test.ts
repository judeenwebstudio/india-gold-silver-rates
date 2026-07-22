import assert from "node:assert/strict";
import test from "node:test";

import { CityRateDataError, calculateCityDisplayRate } from "../lib/city-rate-calculation";

test("adds positive, negative, and zero city adjustments", () => {
  assert.equal(calculateCityDisplayRate(10_000, 40), 10_040);
  assert.equal(calculateCityDisplayRate(10_000, -25.5), 9_974.5);
  assert.equal(calculateCityDisplayRate(10_000, 0), 10_000);
});

test("keeps four decimal places for per-gram calculations", () => {
  assert.equal(calculateCityDisplayRate(225.46, 1.8), 227.26);
  assert.equal(calculateCityDisplayRate(100.1234, -0.0001), 100.1233);
});

test("rejects invalid or non-positive calculated rates", () => {
  assert.throws(() => calculateCityDisplayRate(0, 1), CityRateDataError);
  assert.throws(() => calculateCityDisplayRate(100, -100), CityRateDataError);
  assert.throws(() => calculateCityDisplayRate(100, Number.NaN), CityRateDataError);
});
