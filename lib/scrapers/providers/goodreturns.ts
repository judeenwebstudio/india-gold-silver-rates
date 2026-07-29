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
    const [gold, silver] = await Promise.all([
      fetchPublicHtml(GOLD_URL, this.config.userAgent, this.config.requestTimeoutMs),
      fetchPublicHtml(SILVER_URL, this.config.userAgent, this.config.requestTimeoutMs),
    ]);
    return parseGoodReturnsRates(gold.html, silver.html, {
      provider: this.name,
      sourceUrl: GOLD_URL,
      fetchedAt: gold.fetchedAt > silver.fetchedAt ? gold.fetchedAt : silver.fetchedAt,
    });
  }
}
