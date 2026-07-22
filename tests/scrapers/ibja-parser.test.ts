import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { ScraperRejectedError } from "../../lib/scrapers/errors";
import { parseIbjaRates } from "../../lib/scrapers/providers/ibja-parser";

const fixturePath = new URL("../fixtures/ibja-rates.html", import.meta.url);
const context = {
  provider: "IBJA",
  sourceUrl: "https://www.ibjarates.com/",
  fetchedAt: "2026-07-22T11:30:00.000Z",
};

async function fixture() {
  return readFile(fixturePath, "utf8");
}

test("parses all requested IBJA AM and PM purities", async () => {
  const result = parseIbjaRates(await fixture(), context);

  assert.equal(result.quotes.length, 6);
  assert.equal(result.preferredSession, "PM");
  assert.equal(result.sourceDate, "2026-07-22");
  assert.equal(result.sourceTime, "18:00 IST");
  assert.deepEqual(
    result.quotes.map(({ code }) => code),
    ["GOLD_999", "GOLD_995", "GOLD_916", "GOLD_750", "GOLD_585", "SILVER_999"],
  );
});

test("normalizes gold per 10 grams and silver per kilogram", async () => {
  const result = parseIbjaRates(await fixture(), context);
  const gold999 = result.quotes.find(({ code }) => code === "GOLD_999");
  const silver999 = result.quotes.find(({ code }) => code === "SILVER_999");

  assert.equal(gold999?.am.sourceValue, "145440.00");
  assert.equal(gold999?.am.pricePerGram, "14544.0000");
  assert.equal(gold999?.pm?.pricePerGram, "14528.3000");
  assert.equal(gold999?.mappedPurity, "K24");

  assert.equal(silver999?.am.sourceValue, "226238.00");
  assert.equal(silver999?.am.pricePerGram, "226.2380");
  assert.equal(silver999?.am.pricePerKilogram, "226238.00");
  assert.equal(silver999?.mappedPurity, "P999");
  assert.equal(result.quotes.find(({ code }) => code === "GOLD_995")?.mappedPurity, null);
});

test("falls back to AM only when every PM value is absent", async () => {
  const html = (await fixture()).replace(
    /(<span id="lbl(?:Gold|Silver)\d+_PM">)[^<]*/g,
    "$1",
  );
  const result = parseIbjaRates(html, context);

  assert.equal(result.preferredSession, "AM");
  assert.equal(result.sourceTime, "12:00 IST");
  assert.ok(result.quotes.every(({ pm }) => pm === null));
});

test("rejects a partially missing PM table", async () => {
  const html = (await fixture()).replace("<span id=\"lblGold999_PM\">145283", "<span id=\"lblGold999_PM\">");

  assert.throws(
    () => parseIbjaRates(html, context),
    (error) => error instanceof ScraperRejectedError && /incomplete/i.test(error.message),
  );
});

test("rejects missing, malformed, zero, and negative AM values", async () => {
  const html = await fixture();
  const invalidValues = ["", "14O440", "0", "-145440"];

  for (const invalidValue of invalidValues) {
    const invalidHtml = html.replace(
      "<span id=\"lblGold999_AM\">145440",
      `<span id="lblGold999_AM">${invalidValue}`,
    );

    assert.throws(
      () => parseIbjaRates(invalidHtml, context),
      (error) => error instanceof ScraperRejectedError,
    );
  }
});
