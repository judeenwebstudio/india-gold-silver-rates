import assert from "node:assert/strict";
import test from "node:test";
import { extractGoodReturnsCityLinks } from "../../lib/scrapers/providers/goodreturns-catalogue";

test("catalogue accepts only provider-owned city rate links", () => {
  const html = `<a href="/gold-rates/chennai.html">Chennai</a>
    <a href="https://www.goodreturns.in/gold-rates/davanagere.html?src=nav">Davanagere</a>
    <a href="/news/gold-chennai.html">Not a city page</a>`;
  const cities = extractGoodReturnsCityLinks(html, "gold");
  assert.deepEqual([...cities], [["chennai", "Chennai"], ["davanagere", "Davanagere"]]);
});

test("catalogue never derives a silver mapping from a gold link", () => {
  const html = `<a href="/gold-rates/chennai.html">Chennai</a>`;
  assert.equal(extractGoodReturnsCityLinks(html, "silver").size, 0);
});
