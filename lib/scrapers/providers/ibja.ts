import { fetchPublicHtml } from "@/lib/scrapers/http";
import { parseIbjaRates } from "@/lib/scrapers/providers/ibja-parser";
import type {
  RateScraperProvider,
  ScraperProviderConfig,
} from "@/lib/scrapers/types";

export class IbjaRateProvider implements RateScraperProvider {
  readonly name: string;
  readonly sourceUrl: string;
  private readonly userAgent: string;
  private readonly requestTimeoutMs: number;

  constructor(config: ScraperProviderConfig) {
    this.name = config.name;
    this.sourceUrl = config.url;
    this.userAgent = config.userAgent;
    this.requestTimeoutMs = config.requestTimeoutMs;
  }

  async scrape() {
    const response = await fetchPublicHtml(
      this.sourceUrl,
      this.userAgent,
      this.requestTimeoutMs,
    );
    return parseIbjaRates(response.html, {
      provider: this.name,
      sourceUrl: this.sourceUrl,
      fetchedAt: response.fetchedAt,
    });
  }
}
