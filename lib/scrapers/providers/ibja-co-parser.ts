import { load } from "cheerio";

import { ScraperRejectedError } from "@/lib/scrapers/errors";
import type {
  NormalizedSessionRate,
  ScrapedRateQuote,
  ScrapedRateResult,
} from "@/lib/scrapers/types";

function parsePositiveCurrency(rawValue: string, field: string) {
  const trimmed = rawValue.replace(/\u00a0/g, " ").trim();
  const numericText = trimmed.replace(/^(?:₹|â‚¹|\?|INR|Rs\.?)\s*/i, "");
  if (!numericText || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,4})?$/.test(numericText)) {
    throw new ScraperRejectedError(`Malformed currency value for ${field}.`, {
      field,
      value: trimmed,
    });
  }

  const value = Number(numericText.replaceAll(",", ""));
  if (!Number.isFinite(value) || value <= 0) {
    throw new ScraperRejectedError(`The value for ${field} must be greater than zero.`, { field });
  }
  return value;
}

function normalizePerGram(value: number): NormalizedSessionRate {
  return {
    sourceValue: value.toFixed(2),
    pricePerGram: value.toFixed(4),
    pricePerKilogram: null,
  };
}

function sourceDateFromText(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new ScraperRejectedError("The IBJA.co source date is invalid.");
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function parseIbjaCoRates(
  html: string,
  context: { provider: string; sourceUrl: string; fetchedAt: string },
): ScrapedRateResult {
  const $ = load(html);
  const header = $("#lblHeaderTextForTimeUnit").first().text().trim();
  const preferredSession = /PM/i.test(header) ? "PM" : "AM";
  const sourceDate = sourceDateFromText($("#lblDate").first().text().trim());
  const sourceTime = preferredSession === "PM" ? "18:00 IST" : "12:00 IST";
  const recordedAt = new Date(
    `${sourceDate}T${preferredSession === "PM" ? "18:00:00" : "12:00:00"}+05:30`,
  );

  const gold999 = normalizePerGram(
    parsePositiveCurrency($("#lblFineGold999").first().text(), "Gold 999"),
  );
  const gold916 = normalizePerGram(
    parsePositiveCurrency($("#lblSellingPriceFor22KT").first().text(), "Gold 916"),
  );
  const silverText = $("#lblSilver999, #lblSilver999_AM, #lblSilver999_PM").first().text();
  const silver = normalizePerGram(parsePositiveCurrency(silverText, "Silver 999"));

  return {
    provider: context.provider,
    sourceUrl: context.sourceUrl,
    sourceDate,
    sourceTime,
    recordedAt: recordedAt.toISOString(),
    fetchedAt: context.fetchedAt,
    preferredSession,
    quotes: [
      {
        code: "GOLD_999",
        label: "Gold 999",
        metalType: "GOLD",
        sourcePurity: "999",
        sourceUnit: "PER_GRAM",
        mappedPurity: "K24",
        am: gold999,
        pm: preferredSession === "PM" ? gold999 : null,
      },
      {
        code: "GOLD_916",
        label: "Gold 916",
        metalType: "GOLD",
        sourcePurity: "916",
        sourceUnit: "PER_GRAM",
        mappedPurity: "K22",
        am: gold916,
        pm: preferredSession === "PM" ? gold916 : null,
      },
      {
        code: "SILVER_999",
        label: "Silver 999",
        metalType: "SILVER",
        sourcePurity: "999",
        sourceUnit: "PER_GRAM",
        mappedPurity: "P999",
        am: silver,
        pm: preferredSession === "PM" ? silver : null,
      },
    ] satisfies ScrapedRateQuote[],
  };
}
