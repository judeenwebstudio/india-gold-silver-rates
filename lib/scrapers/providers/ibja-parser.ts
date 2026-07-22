import { load } from "cheerio";

import { ScraperRejectedError } from "@/lib/scrapers/errors";
import type {
  NormalizedSessionRate,
  ScrapedRateQuote,
  ScrapedRateResult,
  ScraperMappedPurity,
  ScraperMetalType,
  SourceRateCode,
  SourceRateUnit,
} from "@/lib/scrapers/types";

type RateDefinition = {
  code: SourceRateCode;
  label: string;
  metalType: ScraperMetalType;
  sourcePurity: string;
  sourceUnit: SourceRateUnit;
  mappedPurity: ScraperMappedPurity | null;
  amSelector: string;
  pmSelector: string;
};

const RATE_DEFINITIONS: RateDefinition[] = [
  { code: "GOLD_999", label: "Gold 999", metalType: "GOLD", sourcePurity: "999", sourceUnit: "PER_10_GRAMS", mappedPurity: "K24", amSelector: "#lblGold999_AM", pmSelector: "#lblGold999_PM" },
  { code: "GOLD_995", label: "Gold 995", metalType: "GOLD", sourcePurity: "995", sourceUnit: "PER_10_GRAMS", mappedPurity: null, amSelector: "#lblGold995_AM", pmSelector: "#lblGold995_PM" },
  { code: "GOLD_916", label: "Gold 916", metalType: "GOLD", sourcePurity: "916", sourceUnit: "PER_10_GRAMS", mappedPurity: "K22", amSelector: "#lblGold916_AM", pmSelector: "#lblGold916_PM" },
  { code: "GOLD_750", label: "Gold 750", metalType: "GOLD", sourcePurity: "750", sourceUnit: "PER_10_GRAMS", mappedPurity: "K18", amSelector: "#lblGold750_AM", pmSelector: "#lblGold750_PM" },
  { code: "GOLD_585", label: "Gold 585", metalType: "GOLD", sourcePurity: "585", sourceUnit: "PER_10_GRAMS", mappedPurity: "K14", amSelector: "#lblGold585_AM", pmSelector: "#lblGold585_PM" },
  { code: "SILVER_999", label: "Silver 999", metalType: "SILVER", sourcePurity: "999", sourceUnit: "PER_KILOGRAM", mappedPurity: "P999", amSelector: "#lblSilver999_AM", pmSelector: "#lblSilver999_PM" },
];

function parsePositiveCurrency(rawValue: string, field: string) {
  const trimmed = rawValue.replace(/\u00a0/g, " ").trim();
  if (!trimmed) {
    throw new ScraperRejectedError(`Missing value for ${field}.`, { field });
  }

  const numericText = trimmed.replace(/^(?:₹|INR|Rs\.?)\s*/i, "");
  const validNumber = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(numericText);
  if (!validNumber) {
    throw new ScraperRejectedError(`Malformed currency value for ${field}.`, {
      field,
      value: trimmed,
    });
  }

  const value = Number(numericText.replaceAll(",", ""));
  if (!Number.isFinite(value) || value <= 0) {
    throw new ScraperRejectedError(`The value for ${field} must be greater than zero.`, {
      field,
    });
  }

  return value;
}

function normalize(value: number, unit: SourceRateUnit): NormalizedSessionRate {
  const perGram = unit === "PER_10_GRAMS" ? value / 10 : value / 1_000;

  return {
    sourceValue: value.toFixed(2),
    pricePerGram: perGram.toFixed(4),
    pricePerKilogram: unit === "PER_KILOGRAM" ? value.toFixed(2) : null,
  };
}

function parseSourceDate(html: string) {
  const pdfMatch = html.match(/Pdf_[^"']*_(\d{4})(\d{2})(\d{2})\d{0,}/i);
  if (pdfMatch) {
    return `${pdfMatch[1]}-${pdfMatch[2]}-${pdfMatch[3]}`;
  }

  const dates = [...html.matchAll(/\b(\d{2})\/(\d{2})\/(\d{4})\b/g)]
    .map((match) => `${match[3]}-${match[2]}-${match[1]}`)
    .sort();

  const latest = dates.at(-1);
  if (!latest) {
    throw new ScraperRejectedError("The source date is missing from the rate document.");
  }

  return latest;
}

export function parseIbjaRates(
  html: string,
  context: { provider: string; sourceUrl: string; fetchedAt: string },
): ScrapedRateResult {
  const $ = load(html);
  const rawRows = RATE_DEFINITIONS.map((definition) => ({
    definition,
    amText: $(definition.amSelector).first().text().trim(),
    pmText: $(definition.pmSelector).first().text().trim(),
  }));

  const pmValueCount = rawRows.filter(({ pmText }) => pmText.length > 0).length;
  if (pmValueCount > 0 && pmValueCount < RATE_DEFINITIONS.length) {
    const missing = rawRows.filter(({ pmText }) => !pmText).map(({ definition }) => definition.label);
    throw new ScraperRejectedError("The PM rate table is incomplete.", { missing });
  }

  const hasPmRates = pmValueCount === RATE_DEFINITIONS.length;
  const quotes: ScrapedRateQuote[] = rawRows.map(({ definition, amText, pmText }) => {
    const amValue = parsePositiveCurrency(amText, `${definition.label} AM`);
    const pmValue = hasPmRates
      ? parsePositiveCurrency(pmText, `${definition.label} PM`)
      : null;

    return {
      code: definition.code,
      label: definition.label,
      metalType: definition.metalType,
      sourcePurity: definition.sourcePurity,
      sourceUnit: definition.sourceUnit,
      mappedPurity: definition.mappedPurity,
      am: normalize(amValue, definition.sourceUnit),
      pm: pmValue === null ? null : normalize(pmValue, definition.sourceUnit),
    };
  });

  const sourceDate = parseSourceDate(html);
  const preferredSession = hasPmRates ? "PM" : "AM";
  const sourceTime = preferredSession === "PM" ? "18:00 IST" : "12:00 IST";
  const recordedAt = new Date(
    `${sourceDate}T${preferredSession === "PM" ? "18:00:00" : "12:00:00"}+05:30`,
  );

  if (Number.isNaN(recordedAt.getTime())) {
    throw new ScraperRejectedError("The source date could not be normalized.");
  }

  return {
    provider: context.provider,
    sourceUrl: context.sourceUrl,
    sourceDate,
    sourceTime,
    recordedAt: recordedAt.toISOString(),
    fetchedAt: context.fetchedAt,
    preferredSession,
    quotes,
  };
}
