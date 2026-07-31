import { load } from "cheerio";
import { prisma } from "@/lib/prisma";
import { fetchPublicHtml } from "@/lib/scrapers/http";
import { parseGoodReturnsRates, normalizeProviderCity } from "@/lib/scrapers/providers/goodreturns-parser";
import { ScraperFetchError } from "@/lib/scrapers/errors";
import type { ScraperProviderConfig } from "@/lib/scrapers/types";

const CATALOGUE_KEY = "goodreturns.providerCityCatalogue";
const DEFAULT_BASE_URL = "https://www.goodreturns.in";

export type VerifiedGoodReturnsCity = {
  providerCity: string;
  providerSlug: string;
  state: string | null;
  goldSupported: boolean;
  silverSupported: boolean;
};

type CatalogueCache = { verifiedAt: string; cities: VerifiedGoodReturnsCity[] };

function baseUrl() {
  return (process.env.GOODRETURNS_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function extractGoodReturnsCityLinks(html: string, kind: "gold" | "silver") {
  const $ = load(html);
  const pattern = new RegExp(`^/${kind}-rates/([a-z0-9-]+)\\.html$`, "i");
  const result = new Map<string, string>();
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href")?.trim() ?? "";
    const pathname = href.startsWith("http") ? new URL(href).pathname : href.split(/[?#]/, 1)[0];
    const match = pathname.match(pattern);
    const providerCity = $(element).text().replace(/\s+/g, " ").trim();
    if (match && providerCity) result.set(match[1].toLowerCase(), providerCity);
  });
  return result;
}

function parseCache(value: string): CatalogueCache | null {
  try {
    const parsed = JSON.parse(value) as CatalogueCache;
    return Array.isArray(parsed.cities) && typeof parsed.verifiedAt === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export async function getVerifiedGoodReturnsCatalogue(
  config: ScraperProviderConfig,
  activeCities: Array<{ name: string; state: { name: string } }>,
) {
  const refreshMinutes = Math.max(1, Number(process.env.GOODRETURNS_REFRESH_MINUTES ?? "15") || 15);
  const cached = await prisma.systemSetting.findUnique({ where: { key: CATALOGUE_KEY }, select: { value: true } });
  const parsedCache = cached ? parseCache(cached.value) : null;
  if (parsedCache && Date.now() - new Date(parsedCache.verifiedAt).getTime() < refreshMinutes * 60_000) {
    return { ...parsedCache, fromCache: true };
  }

  const root = baseUrl();
  const [home, goldIndex, silverIndex] = await Promise.all([
    fetchPublicHtml(`${root}/`, config.userAgent, config.requestTimeoutMs),
    fetchPublicHtml(`${root}/gold-rates/`, config.userAgent, config.requestTimeoutMs),
    fetchPublicHtml(`${root}/silver-rates/`, config.userAgent, config.requestTimeoutMs),
  ]);
  const gold = new Map([...extractGoodReturnsCityLinks(home.html, "gold"), ...extractGoodReturnsCityLinks(goldIndex.html, "gold")]);
  const silver = new Map([...extractGoodReturnsCityLinks(home.html, "silver"), ...extractGoodReturnsCityLinks(silverIndex.html, "silver")]);
  const candidates = [...new Set([...gold.keys(), ...silver.keys()])].sort();
  const exactStates = new Map<string, Set<string>>();
  for (const city of activeCities) {
    const key = normalizeProviderCity(city.name);
    const states = exactStates.get(key) ?? new Set<string>();
    states.add(city.state.name);
    exactStates.set(key, states);
  }
  const verified: VerifiedGoodReturnsCity[] = [];

  for (const providerSlug of candidates) {
    const providerCity = gold.get(providerSlug) ?? silver.get(providerSlug) ?? "";
    if (!providerCity) continue;
    try {
      const [goldPage, silverPage] = await Promise.all([
        fetchPublicHtml(`${root}/gold-rates/${providerSlug}.html`, config.userAgent, config.requestTimeoutMs),
        fetchPublicHtml(`${root}/silver-rates/${providerSlug}.html`, config.userAgent, config.requestTimeoutMs),
      ]);
      parseGoodReturnsRates(goldPage.html, silverPage.html, {
        provider: "GOODRETURNS",
        sourceUrl: `${root}/gold-rates/${providerSlug}.html`,
        fetchedAt: goldPage.fetchedAt > silverPage.fetchedAt ? goldPage.fetchedAt : silverPage.fetchedAt,
        city: {
          cityId: `catalogue:${providerSlug}`, state: "", city: providerCity, citySlug: providerSlug,
          providerCityName: providerCity, providerSlug,
        },
        goldFinalUrl: goldPage.responseUrl,
        silverFinalUrl: silverPage.responseUrl,
      });
      const states = exactStates.get(normalizeProviderCity(providerCity));
      verified.push({
        providerCity,
        providerSlug,
        state: states?.size === 1 ? [...states][0] : null,
        goldSupported: true,
        silverSupported: true,
      });
    } catch (error) {
      console.warn("[rate-sync] GoodReturns catalogue candidate rejected", {
        providerCity, providerSlug, reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (candidates.length > 0 && verified.length === 0) {
    throw new ScraperFetchError(
      "GoodReturns catalogue verification produced no valid Gold and Silver city pairs; the previous catalogue was preserved.",
      { candidateCount: candidates.length, retryable: true },
    );
  }

  const catalogue: CatalogueCache = { verifiedAt: new Date().toISOString(), cities: verified };
  await prisma.systemSetting.upsert({
    where: { key: CATALOGUE_KEY }, update: { value: JSON.stringify(catalogue) },
    create: { key: CATALOGUE_KEY, value: JSON.stringify(catalogue) },
  });
  return { ...catalogue, fromCache: false };
}
