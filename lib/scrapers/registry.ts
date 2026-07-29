import { ScraperConfigurationError } from "@/lib/scrapers/errors";
import { IbjaRateProvider } from "@/lib/scrapers/providers/ibja";
import { IbjaCoRateProvider } from "@/lib/scrapers/providers/ibja-co";
import { GoodReturnsRateProvider } from "@/lib/scrapers/providers/goodreturns";
import type { ConfiguredRateProvider } from "@/lib/scrapers/config";
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

export function createRateScraperProviders(
  config: ScraperProviderConfig,
  providerOrder: ConfiguredRateProvider[] = ["GOODRETURNS", "IBJA"],
) {
  return providerOrder.flatMap((provider): RateScraperProvider[] => {
    if (provider === "GOODRETURNS") return [new GoodReturnsRateProvider(config)];
    if (provider === "IBJA") {
      return [
        createRateScraperProvider({ ...config, name: "IBJA" }),
        new IbjaCoRateProvider({ ...config, name: "IBJA_CO", url: "https://ibja.co/" }),
      ];
    }
    return [];
  });
}
