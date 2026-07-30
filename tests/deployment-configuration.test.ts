import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { sanitizeAuthUrlEnvironment } from "../lib/auth-environment";
import { normalizeDatabaseConnectionString } from "../lib/database-url";

test("invalid optional Auth.js URL overrides are removed", () => {
  const environment = {
    AUTH_URL: "not-an-absolute-url",
    NEXTAUTH_URL: "ftp://example.com",
  };

  sanitizeAuthUrlEnvironment(environment);

  assert.equal(environment.AUTH_URL, undefined);
  assert.equal(environment.NEXTAUTH_URL, undefined);
});

test("valid quoted Auth.js URL overrides are normalized", () => {
  const environment = {
    AUTH_URL: ' "https://rates.example.com" ',
  };

  sanitizeAuthUrlEnvironment(environment);

  assert.equal(environment.AUTH_URL, "https://rates.example.com");
});

test("database URL normalization accepts a quoted PostgreSQL pooler URL", () => {
  const value = normalizeDatabaseConnectionString(
    ' "postgresql://user:password@pooler.example.com:6543/postgres?sslmode=require" ',
  );
  const parsed = new URL(value);

  assert.equal(parsed.protocol, "postgresql:");
  assert.equal(parsed.port, "6543");
  assert.equal(parsed.searchParams.has("sslmode"), false);
});

test("database URL errors never repeat the invalid value", () => {
  const invalidValue = "DATABASE_URL=not-a-url";

  assert.throws(
    () => normalizeDatabaseConnectionString(invalidValue),
    (error) =>
      error instanceof Error &&
      error.message.includes("DATABASE_URL is invalid") &&
      !error.message.includes(invalidValue),
  );
});

test("Vercel Hobby deployment does not register automatic cron jobs", async () => {
  const config = JSON.parse(
    await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
  ) as { crons?: unknown[] };

  assert.equal(config.crons, undefined);
});

test("manual worker endpoints remain protected by CRON_SECRET", async () => {
  const [rateSync, logistics] = await Promise.all([
    readFile(
      new URL("../app/api/cron/rate-sync/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/cron/logistics-reconcile/route.ts", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(rateSync, /secret:\s*process\.env\.CRON_SECRET/);
  assert.match(logistics, /process\.env\.CRON_SECRET/);
  assert.match(logistics, /authorization!==`Bearer \$\{secret\}`/);
});
