import assert from "node:assert/strict";
import test from "node:test";

import { cityAdjustmentSchema, getCityAdjustmentLimit } from "../lib/city-adjustments";

function input(overrides: Partial<Record<string, string>> = {}) {
  return {
    gold24KAdjustment: "40",
    gold22KAdjustment: "0",
    gold18KAdjustment: "-12.5",
    gold14KAdjustment: "0.0000",
    silver999Adjustment: "1.8",
    ...overrides,
  };
}

test("accepts positive, negative, and zero city adjustments", () => {
  const result = cityAdjustmentSchema().safeParse(input());
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.gold24KAdjustment, 40);
    assert.equal(result.data.gold22KAdjustment, 0);
    assert.equal(result.data.gold18KAdjustment, -12.5);
  }
});

test("rejects non-numeric and unreasonably large adjustments", () => {
  assert.equal(cityAdjustmentSchema().safeParse(input({ gold24KAdjustment: "not-a-number" })).success, false);
  assert.equal(
    cityAdjustmentSchema().safeParse(input({ gold24KAdjustment: String(getCityAdjustmentLimit() + 0.0001) })).success,
    false,
  );
});
