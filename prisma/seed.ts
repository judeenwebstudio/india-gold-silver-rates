import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import {
  MetalPurity,
  MetalType,
  Prisma,
  PrismaClient,
  RateUpdateStatus,
} from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const applicationUrl = new URL(connectionString);
applicationUrl.searchParams.delete("sslmode");
applicationUrl.searchParams.delete("uselibpqcompat");

const adapter = new PrismaPg({
  connectionString: applicationUrl.toString(),
  connectionTimeoutMillis: 5_000,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

const SAMPLE_SOURCE = "SEED_SAMPLE";
const SAMPLE_RECORDED_AT = new Date("2026-07-22T05:12:00.000Z");

const states = [
  { name: "Tamil Nadu", slug: "tamil-nadu", code: "TN" },
  { name: "Maharashtra", slug: "maharashtra", code: "MH" },
  { name: "Delhi", slug: "delhi", code: "DL" },
  { name: "Karnataka", slug: "karnataka", code: "KA" },
  { name: "Kerala", slug: "kerala", code: "KL" },
  { name: "Telangana", slug: "telangana", code: "TS" },
] as const;

const cities = [
  { name: "Chennai", slug: "chennai", stateSlug: "tamil-nadu", adjustmentAmount: "40.00" },
  { name: "Coimbatore", slug: "coimbatore", stateSlug: "tamil-nadu", adjustmentAmount: "35.00" },
  { name: "Madurai", slug: "madurai", stateSlug: "tamil-nadu", adjustmentAmount: "30.00" },
  { name: "Tiruchirappalli", slug: "tiruchirappalli", stateSlug: "tamil-nadu", adjustmentAmount: "30.00" },
  { name: "Mumbai", slug: "mumbai", stateSlug: "maharashtra", adjustmentAmount: "0.00" },
  { name: "Pune", slug: "pune", stateSlug: "maharashtra", adjustmentAmount: "10.00" },
  { name: "New Delhi", slug: "new-delhi", stateSlug: "delhi", adjustmentAmount: "15.00" },
  { name: "Bengaluru", slug: "bengaluru", stateSlug: "karnataka", adjustmentAmount: "5.00" },
  { name: "Kochi", slug: "kochi", stateSlug: "kerala", adjustmentAmount: "20.00" },
  { name: "Hyderabad", slug: "hyderabad", stateSlug: "telangana", adjustmentAmount: "0.00" },
] as const;

const goldBaseRates = [
  { purity: MetalPurity.K24, pricePerGram: 10_470 },
  { purity: MetalPurity.K22, pricePerGram: 9_598 },
  { purity: MetalPurity.K18, pricePerGram: 7_853 },
  { purity: MetalPurity.K14, pricePerGram: 6_108 },
] as const;

const silverBaseRates = [
  { purity: MetalPurity.P999, pricePerGram: 122.4 },
  { purity: MetalPurity.P925, pricePerGram: 113.2 },
] as const;

async function main() {
  const stateIds = new Map<string, string>();

  for (const stateData of states) {
    const state = await prisma.state.upsert({
      where: { slug: stateData.slug },
      update: {
        name: stateData.name,
        code: stateData.code,
        isActive: true,
      },
      create: {
        ...stateData,
        isActive: true,
      },
    });

    stateIds.set(state.slug, state.id);
  }

  const seededCities = [];

  for (const cityData of cities) {
    const stateId = stateIds.get(cityData.stateSlug);

    if (!stateId) {
      throw new Error(`Missing state for city ${cityData.name}.`);
    }

    const city = await prisma.city.upsert({
      where: { slug: cityData.slug },
      update: {
        name: cityData.name,
        stateId,
        adjustmentAmount: cityData.adjustmentAmount,
        isActive: true,
      },
      create: {
        name: cityData.name,
        slug: cityData.slug,
        stateId,
        adjustmentAmount: cityData.adjustmentAmount,
        isActive: true,
      },
    });

    seededCities.push(city);
  }

  await prisma.metalRate.deleteMany({
    where: { source: SAMPLE_SOURCE },
  });

  const rateRows: Prisma.MetalRateCreateManyInput[] = [];

  for (const city of seededCities) {
    const cityAdjustment = Number(city.adjustmentAmount);

    for (const rate of goldBaseRates) {
      rateRows.push({
        metalType: MetalType.GOLD,
        purity: rate.purity,
        pricePerGram: (rate.pricePerGram + cityAdjustment).toFixed(2),
        pricePerKilogram: null,
        cityId: city.id,
        source: SAMPLE_SOURCE,
        recordedAt: SAMPLE_RECORDED_AT,
      });
    }

    for (const rate of silverBaseRates) {
      const pricePerGram = rate.pricePerGram + cityAdjustment / 100;

      rateRows.push({
        metalType: MetalType.SILVER,
        purity: rate.purity,
        pricePerGram: pricePerGram.toFixed(2),
        pricePerKilogram: (pricePerGram * 1_000).toFixed(2),
        cityId: city.id,
        source: SAMPLE_SOURCE,
        recordedAt: SAMPLE_RECORDED_AT,
      });
    }
  }

  await prisma.metalRate.createMany({ data: rateRows });

  await prisma.systemSetting.upsert({
    where: { key: "rates.sampleDataEnabled" },
    update: { value: "true" },
    create: { key: "rates.sampleDataEnabled", value: "true" },
  });

  await prisma.rateUpdateLog.create({
    data: {
      source: SAMPLE_SOURCE,
      status: RateUpdateStatus.SUCCESS,
      message: `Seeded ${rateRows.length} sample rates for ${seededCities.length} cities.`,
      rawData: {
        stateCount: states.length,
        cityCount: seededCities.length,
        rateCount: rateRows.length,
      },
    },
  });

  console.info(
    `Database seeded with ${states.length} states, ${seededCities.length} cities, and ${rateRows.length} sample rates.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Database seeding failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
