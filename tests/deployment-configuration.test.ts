import assert from "node:assert/strict";
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
