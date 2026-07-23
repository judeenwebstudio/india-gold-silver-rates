import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DIRECT_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "postgresql://prisma-generate.invalid:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --import tsx prisma/seed.ts",
  },
  datasource: {
    // Client generation does not connect to PostgreSQL, so a non-routable
    // placeholder keeps Vercel installs deterministic when runtime variables
    // are scoped outside the build step. Migrations still require a real URL.
    url: databaseUrl,
  },
});
