import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import {
  PrismaClient,
  RateUpdateStatus,
} from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

if (!adminEmail || !adminPassword) {
  throw new Error(
    "ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the default administrator.",
  );
}

if (adminPassword.length < 12) {
  throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
}

const seededAdminEmail = adminEmail;
const seededAdminPassword = adminPassword;

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

const states = [
  { name: "Tamil Nadu", slug: "tamil-nadu", code: "TN" },
  { name: "Maharashtra", slug: "maharashtra", code: "MH" },
  { name: "Delhi", slug: "delhi", code: "DL" },
  { name: "Karnataka", slug: "karnataka", code: "KA" },
  { name: "Kerala", slug: "kerala", code: "KL" },
  { name: "Telangana", slug: "telangana", code: "TS" },
] as const;

const cities = [
  { name: "Chennai", slug: "chennai", stateSlug: "tamil-nadu", gold24KAdjustment: "40.0000", gold22KAdjustment: "37.0000", gold18KAdjustment: "30.0000", gold14KAdjustment: "24.0000", silver999Adjustment: "1.8000" },
  { name: "Coimbatore", slug: "coimbatore", stateSlug: "tamil-nadu", gold24KAdjustment: "35.0000", gold22KAdjustment: "32.0000", gold18KAdjustment: "26.0000", gold14KAdjustment: "20.0000", silver999Adjustment: "1.2000" },
  { name: "Madurai", slug: "madurai", stateSlug: "tamil-nadu", gold24KAdjustment: "30.0000", gold22KAdjustment: "28.0000", gold18KAdjustment: "22.0000", gold14KAdjustment: "17.0000", silver999Adjustment: "1.0000" },
  { name: "Tiruchirappalli", slug: "tiruchirappalli", stateSlug: "tamil-nadu", gold24KAdjustment: "30.0000", gold22KAdjustment: "28.0000", gold18KAdjustment: "22.0000", gold14KAdjustment: "17.0000", silver999Adjustment: "1.0000" },
  { name: "Mumbai", slug: "mumbai", stateSlug: "maharashtra", gold24KAdjustment: "0.0000", gold22KAdjustment: "0.0000", gold18KAdjustment: "0.0000", gold14KAdjustment: "0.0000", silver999Adjustment: "0.0000" },
  { name: "Pune", slug: "pune", stateSlug: "maharashtra", gold24KAdjustment: "10.0000", gold22KAdjustment: "9.0000", gold18KAdjustment: "7.0000", gold14KAdjustment: "5.0000", silver999Adjustment: "0.2000" },
  { name: "New Delhi", slug: "new-delhi", stateSlug: "delhi", gold24KAdjustment: "15.0000", gold22KAdjustment: "14.0000", gold18KAdjustment: "11.0000", gold14KAdjustment: "8.0000", silver999Adjustment: "0.3000" },
  { name: "Bengaluru", slug: "bengaluru", stateSlug: "karnataka", gold24KAdjustment: "5.0000", gold22KAdjustment: "5.0000", gold18KAdjustment: "4.0000", gold14KAdjustment: "3.0000", silver999Adjustment: "0.5000" },
  { name: "Kochi", slug: "kochi", stateSlug: "kerala", gold24KAdjustment: "20.0000", gold22KAdjustment: "18.0000", gold18KAdjustment: "14.0000", gold14KAdjustment: "11.0000", silver999Adjustment: "0.8000" },
  { name: "Hyderabad", slug: "hyderabad", stateSlug: "telangana", gold24KAdjustment: "0.0000", gold22KAdjustment: "0.0000", gold18KAdjustment: "0.0000", gold14KAdjustment: "0.0000", silver999Adjustment: "0.6000" },
] as const;

async function main() {
  const passwordHash = await hash(seededAdminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: seededAdminEmail },
    update: {
      name: "Default Administrator",
      passwordHash,
      isActive: true,
    },
    create: {
      email: seededAdminEmail,
      name: "Default Administrator",
      passwordHash,
      isActive: true,
    },
  });

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
        gold24KAdjustment: cityData.gold24KAdjustment,
        gold22KAdjustment: cityData.gold22KAdjustment,
        gold18KAdjustment: cityData.gold18KAdjustment,
        gold14KAdjustment: cityData.gold14KAdjustment,
        silver999Adjustment: cityData.silver999Adjustment,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: cityData.name,
        slug: cityData.slug,
        stateId,
        gold24KAdjustment: cityData.gold24KAdjustment,
        gold22KAdjustment: cityData.gold22KAdjustment,
        gold18KAdjustment: cityData.gold18KAdjustment,
        gold14KAdjustment: cityData.gold14KAdjustment,
        silver999Adjustment: cityData.silver999Adjustment,
        isActive: true,
      },
    });

    seededCities.push(city);
  }

  await prisma.metalRate.deleteMany({
    where: { source: SAMPLE_SOURCE },
  });

  await prisma.systemSetting.upsert({
    where: { key: "rates.sampleDataEnabled" },
    update: { value: "false" },
    create: { key: "rates.sampleDataEnabled", value: "false" },
  });

  await prisma.rateUpdateLog.create({
    data: {
      source: SAMPLE_SOURCE,
      status: RateUpdateStatus.SUCCESS,
      message: `Seeded purity-wise adjustments for ${seededCities.length} cities without duplicating national rates.`,
      rawData: {
        stateCount: states.length,
        cityCount: seededCities.length,
        cityRateRowsCreated: 0,
      },
    },
  });

  console.info(
    `Database seeded with one administrator, ${states.length} states, ${seededCities.length} cities, and no duplicated city rates.`,
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
