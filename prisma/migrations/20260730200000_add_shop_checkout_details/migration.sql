ALTER TABLE "ShopOrder"
  ADD COLUMN "customerName" TEXT,
  ADD COLUMN "customerPhone" TEXT,
  ADD COLUMN "customerEmail" TEXT,
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "landmark" TEXT,
  ADD COLUMN "deliveryCity" TEXT,
  ADD COLUMN "deliveryDistrict" TEXT,
  ADD COLUMN "deliveryState" TEXT,
  ADD COLUMN "deliveryPincode" TEXT,
  ADD COLUMN "deliveryCountry" TEXT DEFAULT 'India',
  ADD COLUMN "addressType" TEXT,
  ADD COLUMN "rateSource" TEXT,
  ADD COLUMN "rateDate" TIMESTAMP(3),
  ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "ShopOrder_idempotencyKey_key" ON "ShopOrder"("idempotencyKey");

CREATE TABLE "DeliveryAddress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "landmark" TEXT,
  "city" TEXT NOT NULL,
  "district" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "pincode" TEXT NOT NULL,
  "country" TEXT NOT NULL DEFAULT 'India',
  "addressType" TEXT NOT NULL DEFAULT 'HOME',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryAddress_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeliveryAddress_userId_isDefault_idx" ON "DeliveryAddress"("userId", "isDefault");
ALTER TABLE "DeliveryAddress" ADD CONSTRAINT "DeliveryAddress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
