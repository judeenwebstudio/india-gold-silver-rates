import "dotenv/config";

import { getCityDisplayRates, getLatestNationalBaseRates } from "../lib/city-rate-service";
import { prisma } from "../lib/prisma";

function rateMap(snapshot: Awaited<ReturnType<typeof getCityDisplayRates>>) {
  return Object.fromEntries(snapshot.rates.map((rate) => [rate.id, rate.price]));
}

async function verify() {
  const [national, chennai, mumbai, activeStates, activeCities, sampleCityRateRows, migration] = await Promise.all([
    getLatestNationalBaseRates(),
    getCityDisplayRates("chennai"),
    getCityDisplayRates("mumbai"),
    prisma.state.count({ where: { isActive: true } }),
    prisma.city.count({ where: { isActive: true, deletedAt: null, state: { isActive: true } } }),
    prisma.metalRate.count({ where: { source: "SEED_SAMPLE" } }),
    prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      WHERE migration_name = '20260722180000_add_city_purity_adjustments'
      LIMIT 1
    `,
  ]);

  const nationalRates = rateMap(national);
  const chennaiRates = rateMap(chennai);
  const mumbaiRates = rateMap(mumbai);
  const chennaiFormulaValid = chennai.rates.every((rate) =>
    Math.abs(rate.price - (rate.basePrice + rate.adjustment)) < 0.0001,
  );
  const mumbaiMatchesNational = Object.entries(mumbaiRates).every(
    ([id, price]) => Math.abs(price - Number(nationalRates[id])) < 0.0001,
  );
  const ready = migration[0]?.finished_at !== null
    && activeStates === 6
    && activeCities >= 10
    && sampleCityRateRows === 0
    && chennaiFormulaValid
    && mumbaiMatchesNational;

  console.info(JSON.stringify({
    migrationApplied: Boolean(migration[0]?.finished_at),
    activeStates,
    activeCities,
    duplicatedSampleCityRateRows: sampleCityRateRows,
    source: national.source,
    sourceTimestamp: national.sourceTimestamp,
    nationalRates,
    chennaiRates,
    chennaiFormulaValid,
    mumbaiRates,
    mumbaiMatchesNational,
    databaseReady: ready,
  }, null, 2));

  if (!ready) process.exitCode = 1;
}

verify()
  .catch((error: unknown) => {
    console.error("City rate verification failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
