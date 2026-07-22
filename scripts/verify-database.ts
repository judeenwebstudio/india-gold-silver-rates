import "dotenv/config";

import { prisma } from "../lib/prisma";

const expectedTables = [
  "_prisma_migrations",
  "AdminUser",
  "State",
  "City",
  "MetalRate",
  "RateHistory",
  "RateUpdateLog",
  "SystemSetting",
] as const;

async function verifyDatabase() {
  const [
    states,
    cities,
    metalRates,
    sampleMetalRates,
    softDeletedRates,
    rateHistory,
    adminUsers,
    tables,
    sampleState,
  ] = await Promise.all([
    prisma.state.count(),
    prisma.city.count(),
    prisma.metalRate.count(),
    prisma.metalRate.count({ where: { source: "SEED_SAMPLE" } }),
    prisma.metalRate.count({ where: { isActive: false } }),
    prisma.rateHistory.groupBy({
      by: ["action"],
      _count: { _all: true },
      orderBy: { action: "asc" },
    }),
    prisma.adminUser.count({ where: { isActive: true } }),
    prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          '_prisma_migrations',
          'AdminUser',
          'State',
          'City',
          'MetalRate',
          'RateHistory',
          'RateUpdateLog',
          'SystemSetting'
        )
    `,
    prisma.state.findFirst({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        name: true,
        cities: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          take: 1,
          select: { name: true },
        },
      },
    }),
  ]);

  const existingTables = new Set(tables.map(({ table_name }) => table_name));
  const missingTables = expectedTables.filter(
    (tableName) => !existingTables.has(tableName),
  );
  const applicationQuerySucceeded = sampleState !== null;

  console.info(
    JSON.stringify(
      {
        tablesReady: missingTables.length === 0,
        missingTables,
        states,
        cities,
        metalRates,
        sampleMetalRates,
        softDeletedRates,
        rateHistory: Object.fromEntries(
          rateHistory.map(({ action, _count }) => [action, _count._all]),
        ),
        activeAdminUsers: adminUsers,
        applicationQuerySucceeded,
      },
      null,
      2,
    ),
  );

  if (missingTables.length > 0 || !applicationQuerySucceeded || adminUsers < 1) {
    process.exitCode = 1;
  }
}

verifyDatabase()
  .catch((error: unknown) => {
    console.error("Database verification failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
