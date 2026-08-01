CREATE TYPE "CouponDiscountType" AS ENUM ('FIXED', 'PERCENTAGE');
CREATE TYPE "CouponProductScope" AS ENUM ('ALL_PRODUCTS', 'GOLD_ONLY', 'SILVER_ONLY', 'SELECTED_PRODUCTS');
CREATE TYPE "CouponCustomerScope" AS ENUM ('ALL_CUSTOMERS', 'NEW_CUSTOMERS', 'EXISTING_CUSTOMERS', 'SPECIFIC_USERS');
CREATE TYPE "CouponRedemptionStatus" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "discountType" "CouponDiscountType" NOT NULL, "discountValue" INTEGER NOT NULL,
  "maximumDiscountPaise" BIGINT, "minimumPurchasePaise" BIGINT NOT NULL, "maximumTotalUses" INTEGER,
  "perCustomerLimit" INTEGER NOT NULL DEFAULT 1, "productScope" "CouponProductScope" NOT NULL DEFAULT 'ALL_PRODUCTS',
  "customerScope" "CouponCustomerScope" NOT NULL DEFAULT 'ALL_CUSTOMERS', "selectedProductIdsJson" JSONB,
  "specificUserIdsJson" JSONB, "startsAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true, "bannerColor" TEXT DEFAULT '#171717', "icon" TEXT DEFAULT '🎉',
  "termsAndConditions" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_isEnabled_startsAt_expiresAt_idx" ON "Coupon"("isEnabled", "startsAt", "expiresAt");
CREATE INDEX "Coupon_productScope_idx" ON "Coupon"("productScope");
CREATE INDEX "Coupon_customerScope_idx" ON "Coupon"("customerScope");

ALTER TABLE "ShopOrder" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "ShopOrder" ADD COLUMN "couponDiscountType" "CouponDiscountType";
ALTER TABLE "ShopOrder" ADD COLUMN "couponDiscountValue" INTEGER;
ALTER TABLE "ShopOrder" ADD COLUMN "originalSubtotalPaise" BIGINT;
ALTER TABLE "ShopOrder" ADD COLUMN "finalSubtotalPaise" BIGINT;
CREATE INDEX "ShopOrder_couponCode_paymentStatus_idx" ON "ShopOrder"("couponCode", "paymentStatus");

CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL, "couponId" TEXT NOT NULL, "userId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'RESERVED', "discountAmountPaise" BIGINT NOT NULL,
  "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "consumedAt" TIMESTAMP(3), "releasedAt" TIMESTAMP(3),
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");
CREATE INDEX "CouponRedemption_couponId_status_reservedAt_idx" ON "CouponRedemption"("couponId", "status", "reservedAt");
CREATE INDEX "CouponRedemption_userId_couponId_status_idx" ON "CouponRedemption"("userId", "couponId", "status");
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SchemeUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ShopOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
