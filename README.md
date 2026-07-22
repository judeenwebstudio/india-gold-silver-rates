# India Gold & Silver Rates

A production-oriented foundation for an India-focused precious metals rate website. Stage one includes a responsive homepage, reusable UI components, temporary sample rate data, location selectors, a working gold calculator, SEO metadata, and a PostgreSQL/Prisma data model ready for a later live-data integration.

## Technology

- Next.js App Router with TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Vinext/Sites-compatible local and deployment build

## Getting started

### Prerequisites

- Node.js 22.13 or newer
- pnpm 11 or newer
- PostgreSQL 15 or newer (only required when starting database work)

### Install and run

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

3. Update `DATABASE_URL` in `.env` with your PostgreSQL connection string.

4. Generate the Prisma client:

   ```bash
   pnpm db:generate
   ```

5. Start the development server:

   ```bash
   pnpm dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

The homepage currently uses sample data from `lib/sample-data.ts`; no paid gold-rate API is connected.

## Quality checks

```bash
pnpm lint
pnpm build
pnpm test
```

## Database workflow

The initial Prisma schema contains locations, timestamped metal-rate snapshots, and news articles. When a PostgreSQL database is available, create the first development migration with:

```bash
pnpm db:migrate --name init
```

Prisma stores money as integer paise (`BigInt`) to avoid floating-point rounding errors.

## Project structure

```text
app/            App Router pages, metadata, sitemap, robots, and global styles
components/     Reusable homepage components and interactive controls
lib/            Temporary sample data and shared TypeScript types
prisma/         PostgreSQL data model and future migrations
public/         Static public assets
tests/          Rendered-page smoke tests
```

## Current scope

- Homepage UI and interactions
- Sample gold and silver rates
- No external or paid rate API
- Database schema only; the homepage does not query PostgreSQL yet

## Next stage

Recommended next work is an authenticated data-ingestion path, scheduled rate updates from an approved provider, historical chart queries, location-specific pages, and editorial content management.
