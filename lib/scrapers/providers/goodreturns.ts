import { fetchPublicHtml } from "@/lib/scrapers/http";
import { parseGoodReturnsRates } from "@/lib/scrapers/providers/goodreturns-parser";
import type { RateScraperProvider, ScraperProviderConfig } from "@/lib/scrapers/types";

const GOLD_URL = "https://www.goodreturns.in/gold-rates/trichy.html";
const SILVER_URL = "https://www.goodreturns.in/silver-rates/trichy.html";

export class GoodReturnsRateProvider implements RateScraperProvider {
  readonly name = "GOODRETURNS";
  readonly sourceUrl = GOLD_URL;
  readonly config: ScraperProviderConfig;

  constructor(config: ScraperProviderConfig) {
    this.config = { ...config, name: this.name, url: GOLD_URL };
  }

  async scrape() {
    // Fetch sequentially to avoid an unnecessary same-origin request burst.
    const gold = await fetchPublicHtml(GOLD_URL, this.config.userAgent, this.config.requestTimeoutMs);
    const silver = await fetchPublicHtml(SILVER_URL, this.config.userAgent, this.config.requestTimeoutMs);
    const parsed = parseGoodReturnsRates(gold.html, silver.html, {
      provider: this.name,
      sourceUrl: GOLD_URL,
      fetchedAt: gold.fetchedAt > silver.fetchedAt ? gold.fetchedAt : silver.fetchedAt,
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
    });
    return parsed;
  }
}
