import { fetchPublicHtml } from "@/lib/scrapers/http";
import { parseGoodReturnsRates } from "@/lib/scrapers/providers/goodreturns-parser";
import type { RateScraperProvider, ScraperCityTarget, ScraperProviderConfig } from "@/lib/scrapers/types";

const DEFAULT_BASE_URL = "https://www.goodreturns.in";

function baseUrl() {
  return (process.env.GOODRETURNS_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function goodReturnsCityUrls(city: Pick<ScraperCityTarget, "providerSlug">) {
  const encodedSlug = encodeURIComponent(city.providerSlug);
  return {
    gold: `${baseUrl()}/gold-rates/${encodedSlug}.html`,
    silver: `${baseUrl()}/silver-rates/${encodedSlug}.html`,
  };
}

export class GoodReturnsRateProvider implements RateScraperProvider {
  readonly name = "GOODRETURNS";
  readonly sourceUrl: string;
  readonly config: ScraperProviderConfig;
  readonly city: ScraperCityTarget;

  constructor(config: ScraperProviderConfig, city: ScraperCityTarget) {
    this.city = city;
    this.sourceUrl = goodReturnsCityUrls(city).gold;
    this.config = { ...config, name: this.name, url: this.sourceUrl };
  }

  async scrape() {
    // Fetch sequentially to avoid an unnecessary same-origin request burst.
    const urls = goodReturnsCityUrls(this.city);
    const gold = await fetchPublicHtml(urls.gold, this.config.userAgent, this.config.requestTimeoutMs);
    const silver = await fetchPublicHtml(urls.silver, this.config.userAgent, this.config.requestTimeoutMs);
    const parsed = parseGoodReturnsRates(gold.html, silver.html, {
      provider: this.name,
      sourceUrl: urls.gold,
      fetchedAt: gold.fetchedAt > silver.fetchedAt ? gold.fetchedAt : silver.fetchedAt,
      city: this.city,
    });
    console.info("[rate-source] GoodReturns parse result", {
      provider: this.name,
      sourceDate: parsed.sourceDate,
      quoteCount: parsed.quotes.length,
      purities: parsed.quotes.map((quote) => quote.mappedPurity).filter(Boolean),
      goldFromCache: gold.fromCache,
      silverFromCache: silver.fromCache,
      goldResponseSize: gold.responseSize ?? null,
      silverResponseSize: silver.responseSize ?? null,
      parseSuccess: true,
      cityId: this.city.cityId,
      city: this.city.city,
      state: this.city.state,
    });
    return parsed;
  }
}
