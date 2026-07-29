import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const footer = read("components/Footer.tsx");
const config = read("lib/footer-config.ts");
const android = read("android-ratestack/app/src/main/java/com/ratestack/app/RateStackApp.kt");
const routes = [
  "about-us", "terms-and-conditions", "refund-policy", "shipping-policy",
  "privacy-policy", "faq", "contact-us",
];

test("footer link order matches the approved order", () => {
  const positions = ["About Us", "Terms & Conditions", "Refund Policy", "Shipping Policy", "Privacy Policy", "FAQ", "Contact Us"].map((label) => config.indexOf(label));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
});

test("footer contains logo, certificate, safe optional social links and responsive layout", () => {
  assert.match(footer, /ratestack-logo\.png/);
  assert.match(footer, /BIS Certificate No/);
  assert.match(footer, /target="_blank" rel="noopener noreferrer"/);
  assert.match(footer, /md:grid-cols-2/);
  assert.match(config, /filter\(\(item\).*Boolean\(item\.url\)/s);
});

test("all policy route files exist with metadata and shared footer", () => {
  for (const route of routes) {
    const source = read(`app/(public)/${route}/page.tsx`);
    assert.match(source, /legalMetadata/);
    assert.match(source, /LegalPage/);
  }
});

test("required policy wording and approved contact details are present", () => {
  assert.match(read("app/(public)/refund-policy/page.tsx"), /final and non-refundable/);
  assert.match(read("app/(public)/shipping-policy/page.tsx"), /FREE/);
  assert.match(config, /info@ratestack\.in/);
  assert.match(config, /HM\/C-6590483527/);
  assert.doesNotMatch(read("app/(public)/contact-us/page.tsx"), /phone|WhatsApp|address/i);
});

test("Android legal links use the same website routes in the approved order", () => {
  const positions = routes.map((route) => android.indexOf(`/${route}`));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
  assert.match(android, /HM\/C-6590483527/);
  assert.match(android, /BuildConfig\.WEBSITE_URL/);
});
