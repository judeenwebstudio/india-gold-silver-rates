import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { DEFAULT_CUSTOMER_RETURN_TO, safeCustomerReturnTo } from "../lib/customer-auth-return";

test("website customer destinations preserve internal paths and query state", () => {
  assert.equal(safeCustomerReturnTo("/shop"), "/shop");
  assert.equal(safeCustomerReturnTo("/profile"), "/profile");
  assert.equal(safeCustomerReturnTo("/shop/orders?tab=tracking"), "/shop/orders?tab=tracking");
  assert.equal(safeCustomerReturnTo("/shop/checkout?productId=silver&weight=10&quantity=2"), "/shop/checkout?productId=silver&weight=10&quantity=2");
  assert.equal(safeCustomerReturnTo("/shop?selection=silver%2F10g"), "/shop?selection=silver%2F10g");
});

test("external, encoded, script, admin and auth-loop destinations use the safe default", () => {
  for (const value of ["https://evil.example", "//evil.example", "%2F%2Fevil.example", "%252F%252Fevil.example", "javascript:alert(1)", "/admin", "/admin/orders", "/auth/google/complete", "/login", "/forgot-password"]) {
    assert.equal(safeCustomerReturnTo(value), DEFAULT_CUSTOMER_RETURN_TO, value);
  }
});

test("password and Google login use the same validated destination", async () => {
  const [modal, start, callback, complete] = await Promise.all([
    fs.readFile("components/AuthModal.tsx", "utf8"),
    fs.readFile("app/api/auth/google/route.ts", "utf8"),
    fs.readFile("app/api/auth/google/callback/route.ts", "utf8"),
    fs.readFile("app/auth/google/complete/page.tsx", "utf8"),
  ]);
  assert.match(modal, /safeCustomerReturnTo\(redirectTo\)/);
  assert.match(modal, /google\?next=.*safeRedirectTo/);
  assert.match(start, /safeAuthRedirect/);
  assert.match(callback, /google_oauth_next/);
  assert.match(complete, /safeCustomerReturnTo\(next\)/);
});

test("checkout preserves selection and does not create payment during restoration", async () => {
  const checkout = await fs.readFile("components/shop/ShopCheckout.tsx", "utf8");
  assert.match(checkout, /redirectTo=\{`\/shop\/checkout\?\$\{params\.toString\(\)\}`\}/);
  assert.match(checkout, /const authRequired = !token/);
  assert.match(checkout, /if \(!token\) return/);
  assert.doesNotMatch(checkout, /if \(!token\).*\/api\/v1\/shop\/checkout/);
});
