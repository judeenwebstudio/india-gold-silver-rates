import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const navigation = read("components/admin/AdminNavigation.tsx");
const dashboard = read("app/admin/(workspace)/dashboard/page.tsx");
const redirects = read("next.config.ts");
const schema = read("prisma/schema.prisma");

test("normal Admin navigation promotes Shop and removes savings scheme workflows", () => {
  assert.match(navigation, /Shop Management/);
  for (const label of ["Shop Dashboard", "Products", "Orders", "Payments", "Invoices", "Customers", "Shop Reports", "Payment Gateway"]) {
    assert.match(navigation, new RegExp(label));
  }
  assert.doesNotMatch(navigation, /Gold & Silver Savings Scheme|Scheme Plans|Scheme Members|Manual Payments|Redemptions|Merchant Compliance/);
});

test("Shop dashboard uses direct-order metrics only", () => {
  for (const metric of ["Total Orders", "Successful Orders", "Pending Orders", "Failed Orders", "Total Sales", "Gold Coin Sales", "Silver Coin Sales", "Total Customers", "Pending Shipments"]) {
    assert.match(dashboard, new RegExp(metric));
  }
  assert.doesNotMatch(dashboard, /Scheme Purchase Balance|Matured Schemes|Redemption liability|Total Scheme Members/);
  assert.match(dashboard, /prisma\.shopOrder/);
});

test("Shop operational pages are direct-order pages", () => {
  for (const route of ["orders", "payments", "invoices", "customers", "shop/reports"]) {
    const source = read(`app/admin/(workspace)/${route}/page.tsx`);
    assert.match(source, /Shop|direct/i);
  }
  assert.doesNotMatch(read("app/admin/(workspace)/payments/page.tsx"), /paymentOrder|installment/i);
});

test("old scheme routes redirect and legacy records remain in schema", () => {
  for (const route of ["dashboard", "plans", "members", "manual-payments", "redemptions", "reports", "merchant-config"]) {
    assert.match(redirects, new RegExp(`/admin/schemes/${route}`));
  }
  for (const model of ["SchemeEnrollment", "PaymentOrder", "Receipt", "RedemptionRequest"]) {
    assert.match(schema, new RegExp(`model ${model}`));
  }
  assert.match(redirects, /plans.*\/admin\/products/);
});
