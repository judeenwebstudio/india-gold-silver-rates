import { ScraperConfigurationError } from "@/lib/scrapers/errors";
import { IbjaRateProvider } from "@/lib/scrapers/providers/ibja";
import { GoodReturnsRateProvider } from "@/lib/scrapers/providers/goodreturns";
import type { ConfiguredRateProvider } from "@/lib/scrapers/config";
import type {
  RateScraperProvider,
  ScraperCityTarget,
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

export function createRateScraperProviders(
  config: ScraperProviderConfig,
  providerOrder: ConfiguredRateProvider[] = ["GOODRETURNS", "IBJA"],
  city?: ScraperCityTarget,
) {
  return providerOrder.flatMap((provider): RateScraperProvider[] => {
    if (provider === "GOODRETURNS") return city ? [new GoodReturnsRateProvider(config, city)] : [];
    if (provider === "IBJA") {
      return [createRateScraperProvider({ ...config, name: "IBJA" })];
    }
    return [];
  });
}
