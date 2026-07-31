import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const catalogue = read("components/shop/ShopCatalogue.tsx");
const checkout = read("components/shop/ShopCheckout.tsx");
const api = read("app/api/v1/shop/checkout/route.ts");
const schema = read("prisma/schema.prisma");
const android = read("android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/NativeShopScreen.kt");

test("Buy Now opens checkout instead of loading a gateway", () => {
  assert.match(catalogue, /\/shop\/checkout\?productId=/);
  assert.match(catalogue, /weight=\$\{selection\.weight\}/);
  assert.match(catalogue, /quantity=\$\{selection\.quantity\}/);
  assert.doesNotMatch(catalogue, /checkout\.razorpay\.com|\/api\/v1\/shop\/checkout/);
});

test("checkout validates customer and Indian delivery details", () => {
  assert.match(api, /valid Indian mobile number/);
  assert.match(api, /six-digit Indian PIN code/);
  for (const field of ["fullName", "mobile", "email", "addressLine1", "city", "district", "state", "pincode"]) assert.match(api, new RegExp(field));
});

test("server recalculates totals and ignores client amounts", () => {
  assert.match(api, /calculateShopPrice/);
  assert.doesNotMatch(api, /clientAmount|totalAmount:\s*parsed\.data/);
  assert.match(api, /totalAmountPaise: price\.totalPaise/);
  assert.match(api, /weightGrams: parsed\.data\.weightGrams/);
  assert.match(checkout, /weightGrams: weight/);
});

test("Shop page has no separate silver calculator section",()=>{
  assert.doesNotMatch(catalogue,/SilverWeightCalculator|Calculate silver from 1g to 1kg|City silver rate display/);
});

test("pending order and idempotent retry precede gateway initiation", () => {
  assert.match(api, /idempotencyKey/);
  assert.match(api, /orderStatus: 'PAYMENT_PENDING'/);
  assert.ok(api.indexOf("prisma.shopOrder.create") < api.lastIndexOf("createRazorpayOrder"));
  assert.match(schema, /idempotencyKey\s+String\?\s+@unique/);
});

test("website contains details, saved address, review and final payment steps", () => {
  for (const wording of ["Customer Details", "Delivery Address", "Order Review", "Payment", "Saved Address", "Confirm & Pay"]) assert.match(checkout, new RegExp(wording));
});

test("Android reviews details before launching payment", () => {
  assert.match(android, /ShopCheckoutDialog/);
  assert.match(android, /Review & Payment/);
  assert.match(android, /Confirm & Pay/);
  assert.match(android, /getDeliveryAddresses/);
});
