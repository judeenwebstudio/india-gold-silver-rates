import "dotenv/config";

import { prisma } from "../lib/prisma";
import {
  INDIA_LOCATIONS,
  type IndiaLocationDefinition,
} from "./data/india-locations";

type ImportSummary = {
  statesInserted: number;
  statesUpdated: number;
  citiesInserted: number;
  citiesUpdated: number;
  duplicatesSkipped: number;
  errors: string[];
};

type ExistingState = {
  id: string;
  name: string;
  slug: string;
  code: string;
};

type ExistingCity = {
  id: string;
  name: string;
  slug: string;
  stateId: string;
};

const ZERO_ADJUSTMENT = "0.0000";

function comparable(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function slugify(value: string) {
  const slug = comparable(value).replace(/\s+/g, "-");
  if (!slug) throw new Error(`Cannot create a slug for "${value}".`);
  return slug;
}

function validateDataset() {
  const stateCount = INDIA_LOCATIONS.filter(({ kind }) => kind === "STATE").length;
  const unionTerritoryCount = INDIA_LOCATIONS.filter(
    ({ kind }) => kind === "UNION_TERRITORY",
  ).length;

  if (stateCount !== 28 || unionTerritoryCount !== 8) {
    throw new Error(
      `Location dataset must contain 28 states and 8 union territories; found ${stateCount} states and ${unionTerritoryCount} union territories.`,
    );
  }

  const slugs = new Set<string>();
  const codes = new Set<string>();

  for (const state of INDIA_LOCATIONS) {
    if (slugs.has(state.slug)) throw new Error(`Duplicate state slug: ${state.slug}.`);
    if (codes.has(state.code)) throw new Error(`Duplicate state code: ${state.code}.`);
    slugs.add(state.slug);
    codes.add(state.code);
  }
}

function buildCityNames(
  state: IndiaLocationDefinition,
  summary: ImportSummary,
) {
  const unique = new Map<string, string>();
  const candidates = [
    ...state.capitals,
    ...state.majorCities,
    ...state.districtHeadquarters,
  ];

  for (const cityName of candidates) {
    const name = cityName.trim();
    const key = comparable(name);
    if (!name || !key) {
      summary.errors.push(`Invalid empty city name in ${state.name}.`);
      continue;
    }
    if (unique.has(key)) {
      summary.duplicatesSkipped += 1;
      continue;
    }
    unique.set(key, name);
  }

  return [...unique.values()];
}

function findExistingState(
  definition: IndiaLocationDefinition,
  existingStates: readonly ExistingState[],
) {
  const matchingSlug = existingStates.find(({ slug }) => slug === definition.slug);
  const matchingCode = existingStates.find(({ code }) => code === definition.code);
  const matchingName = existingStates.find(
    ({ name }) => comparable(name) === comparable(definition.name),
  );
  const matches = new Set(
    [matchingSlug?.id, matchingCode?.id, matchingName?.id].filter(Boolean),
  );

  if (matches.size > 1) {
    throw new Error(
      `${definition.name} conflicts with multiple existing state records.`,
    );
  }

  return matchingSlug ?? matchingCode ?? matchingName;
}

function createUniqueCitySlug(
  cityName: string,
  stateSlug: string,
  usedSlugs: Set<string>,
) {
  const base = slugify(cityName);
  const stateSpecific = `${base}-${stateSlug}`;
  let candidate = usedSlugs.has(base) ? stateSpecific : base;
  let suffix = 2;

  while (usedSlugs.has(candidate)) {
    candidate = `${stateSpecific}-${suffix}`;
    suffix += 1;
  }

  usedSlugs.add(candidate);
  return candidate;
}

async function importLocations() {
  validateDataset();

  const summary: ImportSummary = {
    statesInserted: 0,
    statesUpdated: 0,
    citiesInserted: 0,
    citiesUpdated: 0,
    duplicatesSkipped: 0,
    errors: [],
  };

  const existingStates: ExistingState[] = await prisma.state.findMany({
    select: { id: true, name: true, slug: true, code: true },
  });
  const existingCities: ExistingCity[] = await prisma.city.findMany({
    select: { id: true, name: true, slug: true, stateId: true },
  });
  const usedCitySlugs = new Set(existingCities.map(({ slug }) => slug));

  for (const definition of INDIA_LOCATIONS) {
    try {
      const existing = findExistingState(definition, existingStates);
      const state = await prisma.state.upsert({
        where: { slug: existing?.slug ?? definition.slug },
        update: {
          name: definition.name,
          code: definition.code,
          isActive: true,
        },
        create: {
          name: definition.name,
          slug: definition.slug,
          code: definition.code,
          isActive: true,
        },
      });

      if (existing) {
        summary.statesUpdated += 1;
      } else {
        summary.statesInserted += 1;
        existingStates.push(state);
      }

      const stateCities = existingCities.filter(({ stateId }) => stateId === state.id);
      const existingByName = new Map(
        stateCities.map((city) => [comparable(city.name), city]),
      );

      for (const cityName of buildCityNames(definition, summary)) {
        try {
          const existingCity = existingByName.get(comparable(cityName));
          const slug = existingCity?.slug
            ?? createUniqueCitySlug(cityName, definition.slug, usedCitySlugs);

          const city = await prisma.city.upsert({
            where: { slug },
            update: {
              name: cityName,
              stateId: state.id,
            },
            create: {
              name: cityName,
              slug,
              stateId: state.id,
              gold24KAdjustment: ZERO_ADJUSTMENT,
              gold22KAdjustment: ZERO_ADJUSTMENT,
              gold18KAdjustment: ZERO_ADJUSTMENT,
              gold14KAdjustment: ZERO_ADJUSTMENT,
              silver999Adjustment: ZERO_ADJUSTMENT,
              isActive: true,
            },
          });

          if (existingCity) {
            summary.citiesUpdated += 1;
          } else {
            summary.citiesInserted += 1;
            existingByName.set(comparable(city.name), city);
            existingCities.push(city);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown city error";
          summary.errors.push(`${definition.name} / ${cityName}: ${message}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown state error";
      summary.errors.push(`${definition.name}: ${message}`);
    }
  }

  console.info("\nIndia location import summary");
  console.info(`States inserted: ${summary.statesInserted}`);
  console.info(`States updated: ${summary.statesUpdated}`);
  console.info(`Cities inserted: ${summary.citiesInserted}`);
  console.info(`Cities updated: ${summary.citiesUpdated}`);
  console.info(`Duplicates skipped: ${summary.duplicatesSkipped}`);
  console.info(`Errors: ${summary.errors.length}`);

  for (const error of summary.errors) {
    console.error(`- ${error}`);
  }

  if (summary.errors.length > 0) process.exitCode = 1;
}

importLocations()
  .catch((error: unknown) => {
    console.error(
      "Location import failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
