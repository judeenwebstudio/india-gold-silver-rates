import { ScraperConfigurationError } from "@/lib/scrapers/errors";
import { IbjaRateProvider } from "@/lib/scrapers/providers/ibja";
import type {
  RateScraperProvider,
  ScraperProviderConfig,
} from "@/lib/scrapers/types";

type ProviderFactory = (config: ScraperProviderConfig) => RateScraperProvider;

const providerFactories = new Map<string, ProviderFactory>([
  ["IBJA", (config) => new IbjaRateProvider(config)],
]);

export function createRateScraperProvider(config: ScraperProviderConfig) {
  const factory = providerFactories.get(config.name.trim().toUpperCase());

  if (!factory) {
    throw new ScraperConfigurationError(
      `No scraper provider is registered for ${config.name}.`,
    );
  }

  return factory(config);
}
