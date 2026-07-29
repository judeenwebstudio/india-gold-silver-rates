import assert from "node:assert/strict";
import test from "node:test";
import { parseGoodReturnsRates } from "../../lib/scrapers/providers/goodreturns-parser";
import { selectedSourceValue } from "../../lib/scrapers/validation";

const gold = `
<html><body><h1>Gold Rate in Trichy</h1><time>29 July 2026</time>
<div>Trichy</div><div>24K Gold /g ₹15,818</div>
<div>22K Gold /g ₹14,500</div><div>18K Gold /g ₹12,160</div></body></html>`;
const silver = `
<html><body><h1>Silver Rate in Trichy</h1><time>29 July 2026</time>
<div>Trichy</div><div>Silver /g ₹235</div><div>Silver /kg ₹2,35,000</div></body></html>`;

test("GoodReturns parser accepts exact Trichy Gold and Silver city pages", () => {
  const result = parseGoodReturnsRates(gold, silver, {
    provider: "GOODRETURNS",
    sourceUrl: "https://www.goodreturns.in/gold-rates/trichy.html",
    fetchedAt: "2026-07-29T06:00:00.000Z",
  });
  assert.equal(result.sourceDate, "2026-07-29");
  assert.equal(selectedSourceValue(result, "K24")?.pricePerGram, "15818.0000");
  assert.equal(selectedSourceValue(result, "K22")?.pricePerGram, "14500.0000");
  assert.equal(selectedSourceValue(result, "P999")?.pricePerGram, "235.0000");
  assert.equal(result.rawResponseHash.length, 64);
});

test("GoodReturns parser rejects another city and inconsistent Silver units", () => {
  assert.throws(
    () => parseGoodReturnsRates(gold.replaceAll("Trichy", "Chennai"), silver, {
      provider: "GOODRETURNS", sourceUrl: "fixture", fetchedAt: "2026-07-29T06:00:00.000Z",
    }),
    /exact Trichy/i,
  );
  assert.throws(
    () => parseGoodReturnsRates(gold, silver.replace("2,35,000", "2,45,000"), {
      provider: "GOODRETURNS", sourceUrl: "fixture", fetchedAt: "2026-07-29T06:00:00.000Z",
    }),
    /inconsistent/i,
  );
});

test("GoodReturns parser tolerates normal wrapper and element layout changes", () => {
  const changedGold = gold
    .replaceAll("<div>", "<section><span>")
    .replaceAll("</div>", "</span></section>")
    .replace("<time>", "<p class=\"published\">")
    .replace("</time>", "</p>");
  const changedSilver = silver
    .replaceAll("<div>", "<article><strong>")
    .replaceAll("</div>", "</strong></article>")
    .replace("<time>", "<header>")
    .replace("</time>", "</header>");
  const result = parseGoodReturnsRates(changedGold, changedSilver, {
    provider: "GOODRETURNS", sourceUrl: "fixture", fetchedAt: "2026-07-29T06:00:00.000Z",
  });
  assert.equal(selectedSourceValue(result, "K22")?.pricePerGram, "14500.0000");
  assert.equal(selectedSourceValue(result, "P999")?.pricePerGram, "235.0000");
});
