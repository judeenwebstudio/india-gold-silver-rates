import assert from "node:assert/strict";
import test from "node:test";
import { duplicateGoodReturnsMappings, resolveGoodReturnsCity } from "../../lib/scrapers/providers/goodreturns-city";
import { goodReturnsCityUrls } from "../../lib/scrapers/providers/goodreturns";

test("GoodReturns mapping uses the database city slug by default", () => {
  const mapped = resolveGoodReturnsCity({ id: "1", name: "Davanagere", slug: "davanagere", state: { name: "Karnataka" } });
  assert.equal(mapped.providerSlug, "davanagere");
  assert.match(goodReturnsCityUrls(mapped).gold, /gold-rates\/davanagere\.html$/);
});

test("GoodReturns mapping applies an explicit provider alias", () => {
  const mapped = resolveGoodReturnsCity({ id: "1", name: "Bengaluru", slug: "bengaluru", state: { name: "Karnataka" } });
  assert.equal(mapped.providerCityName, "Bangalore");
  assert.equal(mapped.providerSlug, "bangalore");
});

test("duplicate provider slugs are reported", () => {
  const first = resolveGoodReturnsCity({ id: "1", name: "Bengaluru", slug: "bengaluru", state: { name: "Karnataka" } });
  const duplicates = duplicateGoodReturnsMappings([first, { ...first, cityId: "2", city: "Bangalore" }]);
  assert.equal(duplicates.length, 1);
  assert.equal(duplicates[0].cities.length, 2);
});
