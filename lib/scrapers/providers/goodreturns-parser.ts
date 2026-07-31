import { load } from "cheerio";
import { createHash } from "node:crypto";
import { ScraperRejectedError } from "@/lib/scrapers/errors";
import type { ScrapedRateQuote, ScrapedRateResult, ScraperCityTarget } from "@/lib/scrapers/types";

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function pageText(html: string) {
  const $ = load(`<body>${html.replace(/<[^>]*>/g, " ")}</body>`);
  return $("body").text().replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseDate(text: string) {
  const match = text.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
  if (!match) throw new ScraperRejectedError("GoodReturns rate date is missing.");
  const month = MONTHS[match[2].toLowerCase()];
  const iso = `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (iso > today) throw new ScraperRejectedError("GoodReturns rate date is in the future.");
  return iso;
}

function currencyAfter(text: string, label: RegExp) {
  const match = text.match(new RegExp(`${label.source}\\s*(?:\\/\\s*(?:g|gram|kg))?\\s*(?:₹|INR|Rs\\.?)\\s*([\\d,]+(?:\\.\\d{1,2})?)`, "i"));
  if (!match) throw new ScraperRejectedError(`GoodReturns is missing ${label.source}.`);
  const value = match[1].replaceAll(",", "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) <= 0) {
    throw new ScraperRejectedError(`GoodReturns returned an invalid ${label.source} value.`);
  }
  return value;
}

function quote(code: ScrapedRateQuote["code"], label: string, metalType: "GOLD" | "SILVER", purity: string, mappedPurity: ScrapedRateQuote["mappedPurity"], value: string, perKg = false): ScrapedRateQuote {
  const numeric = BigInt(value.replace(".", ""));
  const decimals = value.includes(".") ? value.length - value.indexOf(".") - 1 : 0;
  const scale = 10n ** BigInt(decimals);
  const perGramScaled = perKg ? numeric / 1000n : numeric;
  const perGram = (Number(perGramScaled) / Number(scale)).toFixed(4);
  const normalized = {
    sourceValue: Number(value).toFixed(2),
    pricePerGram: perGram,
    pricePerKilogram: perKg ? Number(value).toFixed(2) : null,
  };
  return {
    code, label, metalType, sourcePurity: purity,
    sourceUnit: perKg ? "PER_KILOGRAM" : "PER_GRAM",
    mappedPurity, am: normalized, pm: null,
  };
}

export function parseGoodReturnsRates(
  goldHtml: string,
  silverHtml: string,
  context: { provider: string; sourceUrl: string; fetchedAt: string; city: ScraperCityTarget },
): ScrapedRateResult & { rawResponseHash: string } {
  const gold = pageText(goldHtml);
  const silver = pageText(silverHtml);
  const escapedCity = context.city.providerCityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(`Gold Rate in ${escapedCity}\\b`, "i").test(gold) ||
      !new RegExp(`Silver Rate in ${escapedCity}\\b`, "i").test(silver)) {
    throw new ScraperRejectedError(`GoodReturns did not return the requested ${context.city.providerCityName} city pages.`);
  }
  const goldDate = parseDate(goldHtml);
  const silverDate = parseDate(silverHtml);
  if (goldDate !== silverDate) throw new ScraperRejectedError("GoodReturns Gold and Silver rate dates do not match.");

  const gold24 = currencyAfter(gold, /24K\s*Gold/);
  const gold22 = currencyAfter(gold, /22K\s*Gold/);
  const gold18 = currencyAfter(gold, /18K\s*Gold/);
  const silverGram = currencyAfter(silver, /Silver\s*\/\s*(?:g|gram)/);
  const silverKg = currencyAfter(silver, /Silver\s*\/\s*kg/);
  if (Math.abs(Number(silverGram) * 1000 - Number(silverKg)) > 1) {
    throw new ScraperRejectedError("GoodReturns Silver gram and kilogram values are inconsistent.");
  }

  return {
    provider: context.provider,
    sourceUrl: context.sourceUrl,
    sourceDate: goldDate,
    sourceTime: "10:00 IST",
    recordedAt: new Date(`${goldDate}T10:00:00+05:30`).toISOString(),
    fetchedAt: context.fetchedAt,
    preferredSession: "AM",
    city: context.city,
    rawResponseHash: createHash("sha256").update(goldHtml).update(silverHtml).digest("hex"),
    quotes: [
      quote("GOLD_999", "Gold 24K", "GOLD", "999", "K24", gold24),
      quote("GOLD_916", "Gold 22K", "GOLD", "916", "K22", gold22),
      quote("GOLD_750", "Gold 18K", "GOLD", "750", "K18", gold18),
      quote("SILVER_999", "Silver 999", "SILVER", "999", "P999", silverKg, true),
    ],
  };
}
