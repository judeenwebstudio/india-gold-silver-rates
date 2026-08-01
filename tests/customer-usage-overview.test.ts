import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const read = (path: string) => fs.readFile(path, "utf8");

test("usage identity remains SchemeUser and records only successful customer logins", async () => {
  const [schema, login, google, adminAuth] = await Promise.all([read("prisma/schema.prisma"), read("app/api/v1/auth/login/route.ts"), read("app/api/v1/auth/google/route.ts"), read("auth.ts")]);
  assert.match(schema, /customer\s+SchemeUser\s+@relation/);
  assert.match(login, /recordSuccessfulCustomerLogin\(user\.id/);
  assert.match(google, /recordSuccessfulCustomerLogin\(result\.user\.id/);
  assert.doesNotMatch(adminAuth, /recordSuccessfulCustomerLogin/);
});

test("Android and website platform activity is distinct without duplicating customers", async () => {
  const [service, android, report] = await Promise.all([read("lib/customer-activity.ts"), read("android-ratestack/app/src/main/java/com/ratestack/app/data/ApiProvider.kt"), read("lib/customer-usage-report.ts")]);
  assert.match(android, /X-RateStack-Platform.*ANDROID/s);
  assert.match(service, /CustomerActivityPlatform\.ANDROID/);
  assert.match(report, /groupBy\(\{ by: \["customerId", "platform"\]/);
  assert.match(report, /platforms\.size === 2 \? "Both"/);
});

test("session lastSeen updates are throttled and never expose sensitive credentials", async () => {
  const service = await read("lib/customer-activity.ts");
  const schema = await read("prisma/schema.prisma");
  assert.match(service, /15 \* 60_000/);
  assert.match(service, /createHmac\("sha256"/);
  const activity = schema.slice(schema.indexOf("model CustomerPlatformActivity"), schema.indexOf("model ShopProduct"));
  for (const forbidden of ["password", "accessToken", "refreshToken", "fcmToken"]) assert.doesNotMatch(activity, new RegExp(forbidden, "i"));
});

test("usage filters, pagination, IST today, CSV audit and authorization are enforced", async () => {
  const [report, page, route, guard] = await Promise.all([read("lib/customer-usage-report.ts"), read("app/admin/(workspace)/customers/usage/page.tsx"), read("app/admin/(workspace)/customers/usage/export/route.ts"), read("lib/customer-admin.ts")]);
  assert.match(report, /startOfIstDay/);
  assert.match(report, /platformActivities/);
  assert.match(page, /take = 25/);
  assert.match(route, /CUSTOMER_USAGE_CSV_EXPORTED/);
  assert.match(route, /CUSTOMER_USAGE_EXPORT/);
  assert.match(guard, /ADMIN_UNAUTHORIZED/);
  assert.match(guard, /CSRF_REJECTED/);
  for (const forbidden of ["passwordHash", "token", "deviceIdHash", "ipHash"]) assert.doesNotMatch(page + route, new RegExp(forbidden));
});
