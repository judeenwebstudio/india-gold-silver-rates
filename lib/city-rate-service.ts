import { MetalPurity, MetalType, RateHistoryAction, type MetalRate } from "@/generated/prisma/client";
import { calculateCityDisplayRate, CityRateDataError, roundRate } from "@/lib/city-rate-calculation";
import { prisma } from "@/lib/prisma";
import type {
  DisplayRate,
  MajorCityRate,
  PublicRateSnapshot,
  PublicStateOption,
} from "@/lib/public-rate-types";

const REQUIRED_BASE_RATES = [
  { metalType: MetalType.GOLD, purity: MetalPurity.K24 },
  { metalType: MetalType.GOLD, purity: MetalPurity.K22 },
  { metalType: MetalType.GOLD, purity: MetalPurity.K18 },
  { metalType: MetalType.GOLD, purity: MetalPurity.K14 },
  { metalType: MetalType.SILVER, purity: MetalPurity.P999 },
] as const;

type BaseRateKey = `${MetalType}:${MetalPurity}`;
type NationalRate = Pick<
  MetalRate,
  "id" | "metalType" | "purity" | "pricePerGram" | "pricePerKilogram" | "source" | "recordedAt" | "updatedAt"
>;

type AdjustmentAmount = number | { toString(): string };
type CityAdjustments = {
  gold24KAdjustment: AdjustmentAmount;
  gold22KAdjustment: AdjustmentAmount;
  gold18KAdjustment: AdjustmentAmount;
  gold14KAdjustment: AdjustmentAmount;
  silver999Adjustment: AdjustmentAmount;
};

export { calculateCityDisplayRate, CityRateDataError } from "@/lib/city-rate-calculation";

function key(metalType: MetalType, purity: MetalPurity): BaseRateKey {
  return `${metalType}:${purity}`;
}

export async function getPublicLocations(): Promise<PublicStateOption[]> {
  return prisma.state.findMany({
    where: {
      isActive: true,
      cities: { some: { isActive: true, deletedAt: null } },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      cities: {
        where: { isActive: true, deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      },
    },
  });
}

async function getNationalRateRecords() {
  const records = await Promise.all(
    REQUIRED_BASE_RATES.map(({ metalType, purity }) =>
      prisma.metalRate.findMany({
        where: {
          metalType,
          purity,
          cityId: null,
          isActive: true,
          deletedAt: null,
        },
        orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
        take: 2,
        select: {
          id: true,
          metalType: true,
          purity: true,
          pricePerGram: true,
          pricePerKilogram: true,
          source: true,
          recordedAt: true,
          updatedAt: true,
        },
      }),
    ),
  );

  const latest = new Map<BaseRateKey, NationalRate>();
  const previous = new Map<BaseRateKey, number>();

  records.forEach((purityRecords, index) => {
    const definition = REQUIRED_BASE_RATES[index];
    const rateKey = key(definition.metalType, definition.purity);
    if (purityRecords[0]) latest.set(rateKey, purityRecords[0]);
    if (purityRecords[1]) previous.set(rateKey, Number(purityRecords[1].pricePerGram));
  });

  const missing = REQUIRED_BASE_RATES.filter(
    ({ metalType, purity }) => !latest.has(key(metalType, purity)),
  );
  if (missing.length > 0) {
    throw new CityRateDataError(
      `Missing national base rates for ${missing.map(({ purity }) => purity).join(", ")}.`,
    );
  }

  const latestIds = [...latest.values()].map((rate) => rate.id);
  const updateHistory = latestIds.length > 0
    ? await prisma.rateHistory.findMany({
        where: { metalRateId: { in: latestIds }, action: RateHistoryAction.UPDATE },
        orderBy: { createdAt: "desc" },
        select: { metalRateId: true, previousData: true },
      })
    : [];
  const latestById = new Map([...latest.entries()].map(([rateKey, rate]) => [rate.id, rateKey]));

  for (const history of updateHistory) {
    const rateKey = latestById.get(history.metalRateId);
    if (!rateKey || previous.has(rateKey) || !history.previousData || Array.isArray(history.previousData)) continue;
    const previousData = history.previousData as Record<string, unknown>;
    const previousPrice = Number(previousData.pricePerGram);
    if (Number.isFinite(previousPrice) && previousPrice > 0) previous.set(rateKey, previousPrice);
  }

  return { latest, previous };
}

function createRate(
  latest: Map<BaseRateKey, NationalRate>,
  previous: Map<BaseRateKey, number>,
  definition: {
    id: DisplayRate["id"];
    metalType: MetalType;
    purity: MetalPurity;
    label: string;
    shortLabel: string;
    purityLabel: string;
    unit: string;
    adjustment: number;
    multiplier?: number;
  },
): DisplayRate {
  const rateKey = key(definition.metalType, definition.purity);
  const base = latest.get(rateKey);
  if (!base) throw new CityRateDataError(`Missing ${definition.purityLabel} national rate.`);

  const multiplier = definition.multiplier ?? 1;
  const basePrice = Number(base.pricePerGram) * multiplier;
  const adjustment = definition.adjustment * multiplier;
  const price = calculateCityDisplayRate(basePrice, adjustment);
  const previousBase = previous.get(rateKey);
  const previousPrice = previousBase
    ? calculateCityDisplayRate(previousBase * multiplier, adjustment)
    : null;
  const change = previousPrice === null ? null : roundRate(price - previousPrice);
  const changePercent = previousPrice === null || previousPrice === 0
    ? null
    : roundRate(((price - previousPrice) / previousPrice) * 100, 2);

  return {
    id: definition.id,
    label: definition.label,
    shortLabel: definition.shortLabel,
    purity: definition.purityLabel,
    unit: definition.unit,
    metal: definition.metalType === MetalType.GOLD ? "gold" : "silver",
    price,
    basePrice: roundRate(basePrice),
    adjustment: roundRate(adjustment),
    previousPrice,
    change,
    changePercent,
  };
}

function buildSnapshot(
  latest: Map<BaseRateKey, NationalRate>,
  previous: Map<BaseRateKey, number>,
  location: PublicRateSnapshot["location"],
  adjustments: CityAdjustments,
): PublicRateSnapshot {
  const latestRecords = [...latest.values()];
  const newestSourceRecord = latestRecords.reduce((newest, record) =>
    record.recordedAt > newest.recordedAt ? record : newest,
  );
  const mostRecentlyUpdated = latestRecords.reduce((newest, record) =>
    record.updatedAt > newest.updatedAt ? record : newest,
  );
  const definitions = [
    { id: "gold-24k" as const, metalType: MetalType.GOLD, purity: MetalPurity.K24, label: "24K Gold", shortLabel: "24K Gold / gram", purityLabel: "99.9% pure", unit: "per gram", adjustment: Number(adjustments.gold24KAdjustment) },
    { id: "gold-22k" as const, metalType: MetalType.GOLD, purity: MetalPurity.K22, label: "22K Gold", shortLabel: "22K Gold / gram", purityLabel: "91.6% pure", unit: "per gram", adjustment: Number(adjustments.gold22KAdjustment) },
    { id: "gold-18k" as const, metalType: MetalType.GOLD, purity: MetalPurity.K18, label: "18K Gold", shortLabel: "18K Gold / gram", purityLabel: "75.0% pure", unit: "per gram", adjustment: Number(adjustments.gold18KAdjustment) },
    { id: "gold-14k" as const, metalType: MetalType.GOLD, purity: MetalPurity.K14, label: "14K Gold", shortLabel: "14K Gold / gram", purityLabel: "58.5% pure", unit: "per gram", adjustment: Number(adjustments.gold14KAdjustment) },
    { id: "silver-gram" as const, metalType: MetalType.SILVER, purity: MetalPurity.P999, label: "Silver", shortLabel: "Silver / gram", purityLabel: "999 fine silver", unit: "per gram", adjustment: Number(adjustments.silver999Adjustment) },
    { id: "silver-kg" as const, metalType: MetalType.SILVER, purity: MetalPurity.P999, label: "Silver", shortLabel: "Silver / kilogram", purityLabel: "999 fine silver", unit: "per kilogram", adjustment: Number(adjustments.silver999Adjustment), multiplier: 1000 },
  ];

  return {
    location,
    rates: definitions.map((definition) => createRate(latest, previous, definition)),
    source: newestSourceRecord.source,
    sourceTimestamp: newestSourceRecord.recordedAt.toISOString(),
    lastUpdatedAt: mostRecentlyUpdated.updatedAt.toISOString(),
    indicative: location.cityId !== null,
  };
}

const ZERO_ADJUSTMENTS: CityAdjustments = {
  gold24KAdjustment: 0,
  gold22KAdjustment: 0,
  gold18KAdjustment: 0,
  gold14KAdjustment: 0,
  silver999Adjustment: 0,
};

export async function getLatestNationalBaseRates(): Promise<PublicRateSnapshot> {
  const { latest, previous } = await getNationalRateRecords();
  return buildSnapshot(
    latest,
    previous,
    { cityId: null, cityName: "All India", citySlug: null, stateId: null, stateName: "National", stateSlug: null },
    ZERO_ADJUSTMENTS,
  );
}

export async function getCityDisplayRates(citySlug: string): Promise<PublicRateSnapshot> {
  const [city, baseRates] = await Promise.all([
    prisma.city.findFirst({
      where: {
        slug: citySlug,
        isActive: true,
        deletedAt: null,
        state: { isActive: true },
      },
      include: { state: true },
    }),
    getNationalRateRecords(),
  ]);

  if (!city) throw new CityRateDataError("The requested active city was not found.");

  return buildSnapshot(
    baseRates.latest,
    baseRates.previous,
    {
      cityId: city.id,
      cityName: city.name,
      citySlug: city.slug,
      stateId: city.state.id,
      stateName: city.state.name,
      stateSlug: city.state.slug,
    },
    city,
  );
}

export async function getMajorCityDisplayRates(limit = 6): Promise<MajorCityRate[]> {
  const [cities, baseRates] = await Promise.all([
    prisma.city.findMany({
      where: { isActive: true, deletedAt: null, state: { isActive: true } },
      include: { state: true },
      orderBy: [{ name: "asc" }],
      take: limit,
    }),
    getNationalRateRecords(),
  ]);

  return cities.map((city) => {
    const snapshot = buildSnapshot(
      baseRates.latest,
      baseRates.previous,
      {
        cityId: city.id,
        cityName: city.name,
        citySlug: city.slug,
        stateId: city.state.id,
        stateName: city.state.name,
        stateSlug: city.state.slug,
      },
      city,
    );
    const byId = new Map(snapshot.rates.map((rate) => [rate.id, rate]));
    return {
      city: city.name,
      citySlug: city.slug,
      state: city.state.name,
      gold24k: byId.get("gold-24k")?.price ?? 0,
      gold22k: byId.get("gold-22k")?.price ?? 0,
      silverKg: byId.get("silver-kg")?.price ?? 0,
    };
  });
}
