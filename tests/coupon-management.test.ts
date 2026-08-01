import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateCouponDiscount, calculateCouponTotals } from "../lib/coupon-pricing";

test("fixed and percentage coupon arithmetic is exact", () => {
  assert.equal(calculateCouponDiscount(50_000n,{discountType:"FIXED",discountValue:10_000}),10_000n);
  assert.equal(calculateCouponDiscount(100_000n,{discountType:"PERCENTAGE",discountValue:500}),5_000n);
  assert.equal(calculateCouponDiscount(100_000n,{discountType:"PERCENTAGE",discountValue:2000,maximumDiscountPaise:12_000n}),12_000n);
});

test("GST is recalculated after coupon discount", () => {
  const result=calculateCouponTotals(100_000n,5_000n,0n,300,5_000n);
  assert.deepEqual(result,{originalSubtotalPaise:105_000n,finalSubtotalPaise:100_000n,gstPaise:3_000n,totalPaise:103_000n});
});

test("checkout, payment and invoice use server coupon snapshots", async () => {
  const checkout=await readFile("app/api/v1/shop/checkout/route.ts","utf8");
  const verify=await readFile("app/api/v1/shop/verify/route.ts","utf8");
  const invoice=await readFile("lib/invoice-pdf-renderer.ts","utf8");
  assert.match(checkout,/validateCoupon/);assert.match(checkout,/couponRedemption/);assert.match(checkout,/discountAmountPaise/);
  assert.match(verify,/consumeCouponForOrder/);assert.match(invoice,/Coupon Discount/);
});

test("website and Android share coupon APIs", async () => {
  const website=await readFile("components/shop/ShopCheckout.tsx","utf8");
  const androidApi=await readFile("android-ratestack/app/src/main/java/com/ratestack/app/data/RateStackApi.kt","utf8");
  const androidCheckout=await readFile("android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/NativeShopScreen.kt","utf8");
  assert.match(website,/api\/v1\/coupons\/validate/);assert.match(website,/Coupon Applied/);
  assert.match(androidApi,/api\/v1\/coupons\/active/);assert.match(androidApi,/api\/v1\/coupons\/validate/);
  assert.match(androidCheckout,/Coupon Applied/);assert.match(androidCheckout,/couponCode=appliedCoupon/);
});

test("schema captures validation limits and order snapshots", async () => {
  const schema=await readFile("prisma/schema.prisma","utf8");
  for(const field of ["minimumPurchasePaise","maximumTotalUses","perCustomerLimit","startsAt","expiresAt","isEnabled","CouponRedemption","originalSubtotalPaise","finalSubtotalPaise"])assert.match(schema,new RegExp(field));
});
