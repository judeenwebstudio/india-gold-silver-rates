export type ScraperSession = "AM" | "PM";

export type SourceRateCode =
  | "GOLD_999"
  | "GOLD_995"
  | "GOLD_916"
  | "GOLD_750"
  | "GOLD_585"
  | "SILVER_999";

export type ScraperMetalType = "GOLD" | "SILVER";

export type ScraperMappedPurity = "K24" | "K22" | "K18" | "K14" | "P999";

export type SourceRateUnit = "PER_10_GRAMS" | "PER_KILOGRAM";

export type NormalizedSessionRate = {
  sourceValue: string;
  pricePerGram: string;
  pricePerKilogram: string | null;
};

export type ScrapedRateQuote = {
  code: SourceRateCode;
  label: string;
  metalType: ScraperMetalType;
  sourcePurity: string;
  sourceUnit: SourceRateUnit;
  mappedPurity: ScraperMappedPurity | null;
  am: NormalizedSessionRate;
  pm: NormalizedSessionRate | null;
};

export type ScrapedRateResult = {
  provider: string;
  sourceUrl: string;
  sourceDate: string;
  sourceTime: string;
  recordedAt: string;
  fetchedAt: string;
  preferredSession: ScraperSession;
  quotes: ScrapedRateQuote[];
};

export type ScraperProviderConfig = {
  name: string;
  url: string;
  enabled: boolean;
  maxChangePercent: number;
  userAgent: string;
  requestTimeoutMs: number;
  maxRetries: number;
};

export interface RateScraperProvider {
  readonly name: string;
  readonly sourceUrl: string;
  scrape(): Promise<ScrapedRateResult>;
}
