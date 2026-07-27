import { fetchPublicHtml } from "@/lib/scrapers/http";
import { parseIbjaCoRates } from "@/lib/scrapers/providers/ibja-co-parser";
import type {
  RateScraperProvider,
  ScraperProviderConfig,
} from "@/lib/scrapers/types";

export class IbjaCoRateProvider implements RateScraperProvider {
  readonly name: string;
  readonly sourceUrl: string;
  readonly config: ScraperProviderConfig;
  private readonly userAgent: string;
  private readonly requestTimeoutMs: number;

  constructor(config: ScraperProviderConfig) {
    this.config = config;
    this.name = config.name;
    this.sourceUrl = config.url;
    this.userAgent = config.userAgent;
    this.requestTimeoutMs = config.requestTimeoutMs;
  }

  async scrape() {
    const response = await fetchPublicHtml(this.sourceUrl, this.userAgent, this.requestTimeoutMs);
    console.info("[rate-source] response", {
      provider: this.name,
      sourceUrl: this.sourceUrl,
      responseUrl: response.responseUrl,
      status: response.status,
      fromCache: response.fromCache,
      fetchedAt: response.fetchedAt,
    });

    return parseIbjaCoRates(response.html, {
      provider: this.name,
      sourceUrl: this.sourceUrl,
      fetchedAt: response.fetchedAt,
    });
  }
}
