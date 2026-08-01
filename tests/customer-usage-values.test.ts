import assert from "node:assert/strict";
import test from "node:test";
import { CustomerActivityPlatform as Platform, CustomerLoginMethod as Method } from "../generated/prisma/client";
import { usageMetricsFromGroups, usageRow } from "../lib/customer-usage-values";

test("zero activity rows and null aggregates produce safe zero values", () => {
  assert.deepEqual(usageMetricsFromGroups(0, null, null, undefined, null), {
    registered: 0, unique: 0, android: 0, web: 0, both: 0,
    activeToday: 0, active7: 0, active30: 0, never: 0,
  });
});

test("website, Android and both-platform customers remain distinct", () => {
  const metrics = usageMetricsFromGroups(3, [
    { customerId: "web", platform: Platform.WEB },
    { customerId: "android", platform: Platform.ANDROID },
    { customerId: "both", platform: Platform.WEB },
    { customerId: "both", platform: Platform.ANDROID },
  ], [], [], []);
  assert.equal(metrics.web, 2);
  assert.equal(metrics.android, 2);
  assert.equal(metrics.both, 1);
  assert.equal(metrics.unique, 3);
});

test("missing optional activity fields render safely", () => {
  const row = usageRow({
    id: "customer", fullName: "Customer", phone: null, email: null,
    isActive: true, accountStatus: "ACTIVE",
    platformActivities: [{ platform: Platform.WEB, loginMethod: Method.EMAIL_PASSWORD }],
  });
  assert.equal(row.platform, "Website");
  assert.equal(row.firstLogin, null);
  assert.equal(row.lastActive, null);
  assert.equal(row.appVersion, null);
});

test("missing migration backfill activity array renders as Never", () => {
  const row = usageRow({ id: "customer", fullName: "Customer", phone: null, email: null, isActive: true, accountStatus: "ACTIVE", platformActivities: undefined });
  assert.equal(row.platform, "Never");
  assert.equal(row.loginCount, 0);
});
