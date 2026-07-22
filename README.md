# India Gold & Silver Rates

A production-oriented foundation for an India-focused precious metals rate website. Stage 1 provides the responsive homepage and temporary sample UI data. Stage 2 adds a PostgreSQL and Prisma ORM foundation without connecting the database to the homepage yet.

## Technology

- Next.js App Router with TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM 7 with the PostgreSQL `pg` adapter
- Vinext/Sites-compatible local build

## Prerequisites

- Node.js 22.13 or newer
- pnpm 11 or newer
- PostgreSQL 15 or newer for migrations, seeding, and Prisma Studio

## Install and run the homepage

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The homepage continues to use temporary data from `lib/sample-data.ts`; no external or paid gold-rate API is connected.

## Database setup

1. Create your local environment file.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS/Linux:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and replace `YOUR_USER` and `YOUR_PASSWORD` with your own PostgreSQL credentials. The completed `.env` is ignored by Git and must never be committed.

3. Generate the Prisma client:

   ```bash
   pnpm db:generate
   ```

4. Create and apply the first migration:

   ```bash
   pnpm db:migrate --name init
   ```

5. Seed states, cities, settings, and sample gold and silver rates:

   ```bash
   pnpm db:seed
   ```

6. Verify the expected tables, seed counts, and application database query:

   ```bash
   pnpm db:verify
   ```

7. Optionally inspect the database:

   ```bash
   pnpm db:studio
   ```

Prisma uses `DATABASE_URL` from `.env` through `prisma.config.ts`. The seed is idempotent for states and cities, and it replaces only rates whose source is `SEED_SAMPLE`.

## Database model

- `State`: active Indian states and union territories
- `City`: state relation and city-specific price adjustment
- `MetalRate`: timestamped gold or silver rates by purity and optional city
- `RateUpdateLog`: audit records for future update jobs
- `SystemSetting`: key/value application configuration

Money values use PostgreSQL `Decimal` columns to avoid floating-point storage errors. The reusable client in `lib/prisma.ts` uses a development singleton to avoid duplicate connection pools during hot reloads.

## Quality checks

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test
```

## Project structure

```text
app/              App Router homepage, metadata, sitemap, and global styles
components/       Reusable homepage components and interactive controls
generated/prisma/ Generated Prisma client (ignored by Git)
lib/              Sample UI data and the shared Prisma client
prisma/           PostgreSQL schema, migrations, and seed script
public/           Static public assets
tests/            Rendered-page smoke tests
```

## Current scope

- Existing sample homepage remains unchanged
- PostgreSQL schema, client, and seed foundation are ready
- Homepage does not query PostgreSQL yet
- No external gold-rate API is integrated

## Recommended next stage

Connect server-only rate queries to App Router pages, add migration-backed development data, and build an authenticated ingestion path for a future approved rate provider.
