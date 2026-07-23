import type { DisplayRate, PublicRateSnapshot } from "@/lib/public-rate-types";
import { prisma } from "@/lib/prisma";

const GOLD_RATE_IDS = ["gold-24k", "gold-22k", "gold-18k"] as const;
const FEATURED_CITY_SLUGS = [
  "chennai",
  "mumbai",
  "new-delhi",
  "bengaluru",
  "hyderabad",
  "kochi",
] as const;

type GoldRateId = (typeof GOLD_RATE_IDS)[number];

function requireRate(
  snapshot: PublicRateSnapshot,
  id: DisplayRate["id"],
) {
  const rate = snapshot.rates.find((candidate) => candidate.id === id);

  if (!rate) {
    throw new Error(`Required rate ${id} is unavailable.`);
  }

  return rate;
}

function purityForRate(id: GoldRateId) {
  const purityById = {
    "gold-24k": "24K",
    "gold-22k": "22K",
    "gold-18k": "18K",
  } as const;

  return purityById[id];
}

function serializeGoldRate(snapshot: PublicRateSnapshot, id: GoldRateId) {
  const rate = requireRate(snapshot, id);

  return {
    purity: purityForRate(id),
    pricePerGram: rate.price,
    previousPricePerGram: rate.previousPrice,
    change: rate.change,
    changePercent: rate.changePercent,
    currency: "INR" as const,
  };
}

function serializeSilverRate(snapshot: PublicRateSnapshot) {
  const perGram = requireRate(snapshot, "silver-gram");
  const perKilogram = requireRate(snapshot, "silver-kg");

  return {
    purity: "999" as const,
    pricePerGram: perGram.price,
    pricePerKilogram: perKilogram.price,
    previousPricePerGram: perGram.previousPrice,
    changePerGram: perGram.change,
    changePercent: perGram.changePercent,
    currency: "INR" as const,
  };
}

export function serializeNationalRates(snapshot: PublicRateSnapshot) {
  return {
    latestGoldRates: GOLD_RATE_IDS.map((id) =>
      serializeGoldRate(snapshot, id),
    ),
    latestSilverRate: serializeSilverRate(snapshot),
    lastUpdated: snapshot.lastUpdatedAt,
    source: {
      name: snapshot.source,
      timestamp: snapshot.sourceTimestamp,
    },
  };
}

export function serializeCityRates(snapshot: PublicRateSnapshot) {
  return {
    state: {
      name: snapshot.location.stateName,
      slug: snapshot.location.stateSlug,
    },
    city: {
      name: snapshot.location.cityName,
      slug: snapshot.location.citySlug,
    },
    goldRates: GOLD_RATE_IDS.map((id) => serializeGoldRate(snapshot, id)),
    silverRate: serializeSilverRate(snapshot),
    lastUpdated: snapshot.lastUpdatedAt,
    source: {
      name: snapshot.source,
      timestamp: snapshot.sourceTimestamp,
    },
    indicative: snapshot.indicative,
  };
}

export async function getV1States() {
  const states = await prisma.state.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      name: true,
      slug: true,
      code: true,
      _count: {
        select: {
          cities: {
            where: { isActive: true, deletedAt: null },
          },
        },
      },
    },
  });

  return {
    states: states.map((state) => ({
      name: state.name,
      slug: state.slug,
      code: state.code,
      cityCount: state._count.cities,
    })),
    total: states.length,
  };
}

export async function getV1Cities(limit?: number) {
  const cities = await prisma.city.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      state: { isActive: true },
    },
    orderBy: [{ name: "asc" }, { state: { name: "asc" } }],
    ...(limit ? { take: limit } : {}),
    select: {
      name: true,
      slug: true,
      state: {
        select: { name: true, slug: true, code: true },
      },
    },
  });

  return {
    cities: cities.map(serializeCityLocation),
    total: cities.length,
  };
}

function serializeCityLocation(city: {
  name: string;
  slug: string;
  state: { name: string; slug: string; code: string };
}) {
  return {
    name: city.name,
    slug: city.slug,
    state: city.state,
    ratesUrl: `/api/v1/rates/${city.state.slug}/${city.slug}`,
  };
}

export async function getV1FeaturedCities() {
  const cities = await prisma.city.findMany({
    where: {
      slug: { in: [...FEATURED_CITY_SLUGS] },
      isActive: true,
      deletedAt: null,
      state: { isActive: true },
    },
    select: {
      name: true,
      slug: true,
      state: {
        select: { name: true, slug: true, code: true },
      },
    },
  });
  const cityBySlug = new Map(cities.map((city) => [city.slug, city]));

  return FEATURED_CITY_SLUGS.flatMap((slug) => {
    const city = cityBySlug.get(slug);
    return city ? [serializeCityLocation(city)] : [];
  });
}
