import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("admin production sync calls the GoodReturns catalogue entry point", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/admin/(workspace)/api-logs/actions.ts"), "utf8");
  assert.match(source, /executeGoodReturnsCatalogueSync\("MANUAL_SYNC"\)/);
  assert.match(source, /executeGoodReturnsCatalogueSync\("MANUAL_TEST"\)/);
  assert.doesNotMatch(source, /executeScraper\(/);
});

test("cron production sync calls the GoodReturns catalogue entry point", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "app/api/cron/rate-sync/route.ts"), "utf8");
  assert.match(source, /executeGoodReturnsCatalogueSync\("AUTOMATIC_CRON"/);
  assert.doesNotMatch(source, /executeScraper\("AUTOMATIC_CRON"/);
});
