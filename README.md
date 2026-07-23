# India Gold & Silver Rates

A production-oriented full-stack foundation for an India-focused precious metals rate website. The public homepage reads current national bullion records from PostgreSQL and calculates indicative city prices from purity-wise city adjustments at request time.

## Technology

- Next.js App Router with TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM 7 with the PostgreSQL `pg` adapter
- Auth.js v5 credentials authentication with bcrypt password hashing
- Configurable public rate-source providers with fixture-tested HTML parsing
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

Open [http://localhost:3000](http://localhost:3000). The homepage loads active states and cities from PostgreSQL, defaults to Chennai when available, and updates the displayed rates when a city is selected.

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

2. Open `.env` and replace every placeholder. `AUTH_SECRET` must be a long random value; `ADMIN_PASSWORD` must contain at least 12 characters. The completed `.env` is ignored by Git and must never be committed.

   On Vercel, do not configure `AUTH_URL` or `NEXTAUTH_URL`. Auth.js v5 uses
   Vercel's trusted request host automatically. Configure `AUTH_SECRET` as a
   strong random value with no wrapping quotes.

3. Generate the Prisma client:

   ```bash
   pnpm db:generate
   ```

4. Apply all checked-in migrations:

   ```bash
   pnpm exec prisma migrate deploy
   ```

5. Seed the default administrator, states, cities, settings, and purity-wise city adjustments:

   ```bash
   pnpm db:seed
   ```

6. Verify the expected tables, seed counts, and application database query:

   ```bash
   pnpm db:verify
   ```

7. Verify the city-rate formula against the stored national rates:

   ```bash
   pnpm db:verify-city-rates
   ```

8. Optionally inspect the database:

   ```bash
   pnpm db:studio
   ```

The application uses `DATABASE_URL` at runtime. Prisma migration commands use
`DIRECT_URL` when present and otherwise fall back to `DATABASE_URL`. For Vercel
with Supabase, configure `DATABASE_URL` with the transaction-pooler connection
(port 6543) and use a direct or session-pooler `DIRECT_URL` only from a trusted
migration environment. The seed is idempotent for states and cities. It removes
obsolete `SEED_SAMPLE` city-rate rows but never replaces national IBJA records,
administrator-created records, or Rate History.

## Admin authentication

The admin login is available at [http://localhost:3000/admin/login](http://localhost:3000/admin/login). The seed creates or updates one active administrator using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the local `.env`; the password is stored in PostgreSQL only as a bcrypt hash.

All `/admin/*` workspace routes are protected by Auth.js and the Next.js 16 `proxy.ts` convention. Server-rendered layouts and rate mutation actions also verify the session as defense in depth. Sessions use encrypted JWT cookies with an eight-hour maximum lifetime; production HTTPS cookies are secure, HttpOnly, and same-site protected by Auth.js defaults.

## Configurable rate scraper

The protected [API Logs & Scraper page](http://localhost:3000/admin/api-logs) provides two manual actions:

- **Test Scraper** fetches, parses, validates, and logs the configured public source without changing metal rates.
- **Sync Rates Now** prefers a complete PM table, falls back to AM, validates abnormal movement, and transactionally updates source-owned national rates with Rate History entries.

The initial provider is IBJA Rates. Its parser is isolated under `lib/scrapers/providers`, so a replacement provider can be registered without spreading source-specific selectors through the application. Public HTML and robots responses are cached to avoid rapid repeat requests; access challenges, restrictions, and non-public responses are never bypassed.

Required local configuration:

```dotenv
RATE_SOURCE_NAME="IBJA"
RATE_SOURCE_URL="https://www.ibjarates.com/"
RATE_SOURCE_ENABLED="true"
SCRAPER_MAX_CHANGE_PERCENT="20"
SCRAPER_USER_AGENT="IndiaGoldSilverRates/1.0 (+http://localhost:3000/admin/api-logs)"
SCRAPER_REQUEST_TIMEOUT_MS="15000"
SCRAPER_MAX_RETRIES="2"
```

Run deterministic parser tests with the saved fixture:

```bash
pnpm test:scraper
```

Manual Test Scraper and Sync Rates Now actions remain available after automatic
scheduling is enabled.

## Automatic daily rate synchronization

Vercel Cron calls `GET /api/cron/rate-sync` every day at `0 13 * * *`, which is
1:00 PM UTC and 6:30 PM IST. The endpoint requires
`Authorization: Bearer <CRON_SECRET>` and returns HTTP 401 before doing any work
when the header or configured secret is missing or invalid.

Add these settings to the local `.env` and to the Vercel project environment:

```dotenv
CRON_SECRET="replace-with-a-long-random-secret"
RATE_SYNC_TIMEZONE="Asia/Kolkata"
SCRAPER_REQUEST_TIMEOUT_MS="15000"
SCRAPER_MAX_RETRIES="2"
```

`SCRAPER_MAX_RETRIES=2` means one initial attempt plus at most two retries, for
a hard maximum of three source attempts. Retry delays use exponential backoff.
Validation rejections are never retried. Each source request has a configurable
timeout, and all mutating syncs share a recoverable PostgreSQL execution lease.

For a safe local endpoint test, start the app and run:

```bash
pnpm dev
pnpm cron:local
```

The helper reads `CRON_SECRET` from `.env`, sends it only in the authorization
header, and never prints it. It makes one request and does not start a local
scheduler.

The scheduler status section on the protected
[API Logs & Scraper page](http://localhost:3000/admin/api-logs) shows the latest
automatic attempt, last successful and failed runs, result, source, changed-rate
count, and consecutive failures. Audit rows distinguish `MANUAL_TEST`,
`MANUAL_SYNC`, and `AUTOMATIC_CRON`.

Run the deterministic scheduler tests with:

```bash
pnpm test:scheduler
```

## City-based display rates

The protected [States page](http://localhost:3000/admin/states) shows location coverage. The protected [Cities page](http://localhost:3000/admin/cities) supports search, state filtering, adding, editing, and soft deletion. Each city stores signed per-gram adjustments for Gold 24K, 22K, 18K, 14K, and Silver 999.

The public calculation is:

```text
City display rate = latest active national base rate + city adjustment
```

City prices are not copied into `MetalRate` during a national sync. Inactive and soft-deleted cities are excluded from public locations and city-rate responses. `CITY_ADJUSTMENT_MAX_ABS` controls the maximum absolute adjustment accepted by server-side validation; its default is ₹5,000 when unset.

Public JSON routes:

- `GET /api/locations`
- `GET /api/rates/national`
- `GET /api/rates/city/[slug]`

Responses include the national base, city adjustment, calculated display rate, source timestamp, and last-updated timestamp. Display prices exclude making charges and GST.

## Database model

- `State`: active Indian states and union territories
- `City`: state relation, soft-delete state, and five purity-specific price adjustments
- `MetalRate`: timestamped gold or silver rates by purity and optional city
- `RateUpdateLog`: audit records for future update jobs
- `RateSyncLock`: expiring database lease that prevents overlapping sync jobs
- `SystemSetting`: key/value application configuration

Money values use PostgreSQL `Decimal` columns to avoid floating-point storage errors. The reusable client in `lib/prisma.ts` uses a development singleton to avoid duplicate connection pools during hot reloads.

## Quality checks

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test:scraper
pnpm test:scheduler
pnpm test:scheduler:db
pnpm test:city-rates
pnpm test:production-routes
pnpm build
pnpm test
```

## Project structure

```text
app/              App Router pages, protected admin workspace, and public JSON routes
components/       Reusable public and admin components
generated/prisma/ Generated Prisma client (ignored by Git)
lib/              City-rate, scraper, scheduler, authentication, and Prisma services
prisma/           PostgreSQL schema, migrations, and seed script
public/           Static public assets
tests/            Parser, city calculation, and rendered-page tests
```

## Current scope

- National rates remain source-owned records with `cityId = null`
- City display rates are calculated at read time without duplicated city-rate rows
- Admin authentication, manual Gold/Silver CRUD, Rate History, IBJA scraper, and API logs are preserved
- Daily Vercel Cron sync uses bearer authentication, database locking, retry/backoff, and no-change detection
- Homepage state/city selectors use active PostgreSQL locations
- Making charges and GST calculation are outside the current scope

## Recommended next stage

Add production freshness alerts and administrator notifications for repeated
automatic failures. Before using source rates for commercial valuation or
pricing, evaluate migration to IBJA's official subscribed API.
