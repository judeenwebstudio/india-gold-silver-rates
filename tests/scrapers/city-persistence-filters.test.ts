import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("rate persistence comparison is scoped by provider, city, purity and session", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "lib/scrapers/service.ts"), "utf8");
  assert.match(source, /cityId: sourceCityId \?\? null,\s+provider,\s+sourceSession: parsed\.preferredSession/);
  assert.match(source, /purity: purity as MetalPurity/);
  assert.match(source, /CITY_COMPARE_MISMATCH/);
  assert.doesNotMatch(source, /matched the stored national rates/);
});

test("GoodReturns city persistence is processed sequentially", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "lib/scrapers/service.ts"), "utf8");
  assert.match(source, /for \(const target of supportedTargets\) \{/);
  assert.doesNotMatch(source, /GOODRETURNS_CONCURRENCY/);
  assert.doesNotMatch(source, /Promise\.all\(Array\.from\([^\n]+worker/);
});
