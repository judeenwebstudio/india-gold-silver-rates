import assert from "node:assert/strict";
import test from "node:test";

import { INDIA_LOCATIONS } from "../prisma/data/india-locations";

function comparable(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

test("location dataset contains all Indian states and union territories", () => {
  assert.equal(
    INDIA_LOCATIONS.filter(({ kind }) => kind === "STATE").length,
    28,
  );
  assert.equal(
    INDIA_LOCATIONS.filter(({ kind }) => kind === "UNION_TERRITORY").length,
    8,
  );
  assert.equal(new Set(INDIA_LOCATIONS.map(({ slug }) => slug)).size, 36);
  assert.equal(new Set(INDIA_LOCATIONS.map(({ code }) => code)).size, 36);
});

test("location dataset contains a complete, non-empty city directory", () => {
  let uniqueLocationCount = 0;

  for (const location of INDIA_LOCATIONS) {
    assert.ok(location.districtHeadquarters.length > 0, location.name);
    const cityNames = [
      ...location.capitals,
      ...location.majorCities,
      ...location.districtHeadquarters,
    ];
    const keys = new Set(cityNames.map(comparable));
    assert.ok(!keys.has(""), `${location.name} contains an empty city name.`);
    uniqueLocationCount += keys.size;
  }

  assert.ok(
    uniqueLocationCount >= 750,
    `Expected at least 750 unique state/city pairs; found ${uniqueLocationCount}.`,
  );
});

test("shared Chandigarh capital is represented once under its union territory", () => {
  const chandigarh = INDIA_LOCATIONS.find(({ slug }) => slug === "chandigarh");
  assert.deepEqual(chandigarh?.capitals, ["Chandigarh"]);

  for (const stateSlug of ["haryana", "punjab"]) {
    const state = INDIA_LOCATIONS.find(({ slug }) => slug === stateSlug);
    assert.ok(state);
    assert.equal(state.capitals.length, 0);
  }
});
