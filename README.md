# RateStack

A production-oriented full-stack platform for India-focused precious metals rates. The public homepage reads current national bullion records from PostgreSQL and calculates indicative city prices from purity-wise city adjustments at request time.

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

8. Import the complete India location directory into an existing database:

   ```bash
   pnpm db:import-locations
   ```

   This production-safe importer uses Prisma upserts only. It adds all 28
   states, all 8 union territories, capitals, major cities, and district
   headquarters without deleting or resetting existing records. Existing city
   activity, soft-delete state, and purity-wise adjustments are preserved.
   Newly created cities are active with all adjustment values set to zero. The
   command is safe to rerun and prints inserted, updated, duplicate, and error
   totals.

9. Optionally inspect the database:

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

For production location imports, set `DATABASE_URL` to the Supabase production
transaction-pooler URL in the local ignored `.env` file, then run:

```bash
pnpm db:import-locations
```

The location importer does not run the general seed and does not access admin
users, metal rates, rate history, scraper logs, scheduler locks, or system
settings.

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

## Public REST API v1

The read-only REST API is versioned under `/api/v1` and returns JSON with a
consistent `success`, `data`, and `meta.apiVersion` envelope. Errors use a
stable code and message. Public GET responses include cross-origin and cache
headers suitable for web and mobile clients.

Available endpoints:

- `GET /api/v1/home` — latest Gold 24K, 22K, and 18K rates, Silver 999 per gram
  and kilogram, source timestamps, and six featured active cities
- `GET /api/v1/states` — all active states and union territories with active
  city counts
- `GET /api/v1/cities` — all active, non-deleted cities with their state and
  canonical rates URL
- `GET /api/v1/rates/{state}/{city}` — current indicative Gold 24K, 22K, 18K,
  and Silver 999 rates for a validated state/city slug combination

Examples:

```text
http://localhost:3000/api/v1/home
http://localhost:3000/api/v1/states
http://localhost:3000/api/v1/cities
http://localhost:3000/api/v1/rates/tamil-nadu/chennai
```

Run the deterministic response and validation tests with:

```bash
pnpm test:api
```

## Analytics and Google Analytics 4

The protected [Analytics page](http://localhost:3000/admin/analytics) reports:

- all-time visitors
- unique visitors, page views, sessions, and returning visitors for the latest 30 days
- most visited public pages
- most viewed city rates

First-party reporting uses anonymous random visitor and 30-minute session
cookies. It stores visitor, session, page-view, and city-view records in
PostgreSQL without storing IP addresses. Browser Do Not Track requests and
common automated crawlers are excluded.

To send the same public page views to Google Analytics 4, create a GA4 web data
stream and add its Measurement ID to local and Vercel environments:

```dotenv
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-YOURMEASUREMENTID"
```

The value must use the GA4 `G-...` format. When it is empty or invalid, GA4 is
disabled while local analytics continues working. Tracking components are
mounted only by the public route group and are never rendered in the protected
admin workspace.

Apply the analytics database migration before enabling production tracking:

```bash
pnpm exec prisma migrate deploy
```

## Google AdSense Auto Ads

The protected [AdSense page](http://localhost:3000/admin/adsense) shows the
configured publisher, Auto Ads, `ads.txt`, and site verification status. It
links to the official Google AdSense dashboard and does not attempt to retrieve
earnings, clicks, or impressions.

After Google approves the site, add the real AdSense client value to local and
Vercel environments:

```dotenv
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=""
```

Set this to the real `ca-pub-` value from AdSense. Leaving the
variable empty keeps Auto Ads disabled and returns HTTP 404 from `/ads.txt`.
When configured, the application publishes the matching `ads.txt` entry,
includes the site verification metadata, and loads the Auto Ads script on
public pages only. Admin and API routes never render the AdSense script.

Run the deterministic configuration tests with:

```bash
pnpm test:analytics
```

## Database model

- `State`: active Indian states and union territories
- `City`: state relation, soft-delete state, and five purity-specific price adjustments
- `MetalRate`: timestamped gold or silver rates by purity and optional city
- `RateUpdateLog`: audit records for future update jobs
- `RateSyncLock`: expiring database lease that prevents overlapping sync jobs
- `SystemSetting`: key/value application configuration
- `AnalyticsVisitor`: anonymous first-party visitor profile
- `AnalyticsSession`: 30-minute public browsing session
- `AnalyticsEvent`: idempotent public page and city view

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
pnpm test:analytics
pnpm test:api
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
