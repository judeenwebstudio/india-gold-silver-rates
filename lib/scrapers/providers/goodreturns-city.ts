import type { ScraperCityTarget } from "@/lib/scrapers/types";

const PROVIDER_ALIASES: Record<string, { name: string; slug: string }> = {
  bengaluru: { name: "Bangalore", slug: "bangalore" },
  tiruchirappalli: { name: "Trichy", slug: "trichy" },
  thiruvananthapuram: { name: "Trivandrum", slug: "trivandrum" },
};

export type ActiveCityRecord = {
  id: string;
  name: string;
  slug: string;
  state: { name: string };
};

export function resolveGoodReturnsCity(city: ActiveCityRecord): ScraperCityTarget {
  const alias = PROVIDER_ALIASES[city.slug];
  return {
    cityId: city.id,
    state: city.state.name,
    city: city.name,
    citySlug: city.slug,
    providerCityName: alias?.name ?? city.name,
    providerSlug: alias?.slug ?? city.slug,
  };
}

export function duplicateGoodReturnsMappings(targets: ScraperCityTarget[]) {
  const grouped = new Map<string, ScraperCityTarget[]>();
  for (const target of targets) {
    const key = target.providerSlug.toLowerCase();
    grouped.set(key, [...(grouped.get(key) ?? []), target]);
  }
  return [...grouped.entries()]
    .filter(([, cities]) => cities.length > 1)
    .map(([providerSlug, cities]) => ({
      providerSlug,
      cities: cities.map(({ cityId, city, state }) => ({ cityId, city, state })),
    }));
}
