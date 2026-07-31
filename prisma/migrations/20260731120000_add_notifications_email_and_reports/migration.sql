ALTER TYPE "NotificationOutboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "NotificationOutboxStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
CREATE TYPE "NotificationChannel" AS ENUM ('PUSH', 'EMAIL');
CREATE TYPE "PushPlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');
CREATE TYPE "RateAlertType" AS ENUM ('DAILY_UPDATE', 'PRICE_INCREASE', 'PRICE_DECREASE', 'TARGET_AT_OR_BELOW', 'TARGET_AT_OR_ABOVE');

ALTER TABLE "ShopProduct" ADD COLUMN "productCostPaise" BIGINT, ADD COLUMN "metalAcquisitionCostPaise" BIGINT, ADD COLUMN "packagingCostPaise" BIGINT, ADD COLUMN "shippingCostPaise" BIGINT, ADD COLUMN "gatewayFeeBasisPoints" INTEGER, ADD COLUMN "otherCostPaise" BIGINT;
ALTER TABLE "ShopOrder" ADD COLUMN "productCostPaise" BIGINT, ADD COLUMN "metalAcquisitionCostPaise" BIGINT, ADD COLUMN "packagingCostPaise" BIGINT, ADD COLUMN "shippingCostPaise" BIGINT, ADD COLUMN "gatewayFeePaise" BIGINT, ADD COLUMN "otherCostPaise" BIGINT, ADD COLUMN "costSnapshotComplete" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "NotificationOutbox" ALTER COLUMN "shopOrderId" DROP NOT NULL, ADD COLUMN "customerId" TEXT, ADD COLUMN "channel" "NotificationChannel" NOT NULL DEFAULT 'PUSH', ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD COLUMN "failedAt" TIMESTAMP(3), ADD COLUMN "failureReason" TEXT, ADD COLUMN "providerMessageId" TEXT, ADD COLUMN "deduplicationKey" TEXT;
UPDATE "NotificationOutbox" SET "deduplicationKey" = 'legacy:' || "id", "failureReason" = "lastError" WHERE "deduplicationKey" IS NULL;
ALTER TABLE "NotificationOutbox" ALTER COLUMN "deduplicationKey" SET NOT NULL, DROP COLUMN "lastError";

CREATE TABLE "PushDeviceToken" ("id" TEXT NOT NULL,"customerId" TEXT NOT NULL,"token" TEXT NOT NULL,"platform" "PushPlatform" NOT NULL DEFAULT 'ANDROID',"deviceName" TEXT,"appVersion" TEXT,"isActive" BOOLEAN NOT NULL DEFAULT true,"lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,"revokedAt" TIMESTAMP(3),CONSTRAINT "PushDeviceToken_pkey" PRIMARY KEY ("id"));
CREATE TABLE "CustomerNotificationPreference" ("id" TEXT NOT NULL,"customerId" TEXT NOT NULL,"orderPushEnabled" BOOLEAN NOT NULL DEFAULT true,"deliveryPushEnabled" BOOLEAN NOT NULL DEFAULT true,"promotionalPushEnabled" BOOLEAN NOT NULL DEFAULT false,"emailOrderUpdates" BOOLEAN NOT NULL DEFAULT true,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "CustomerNotificationPreference_pkey" PRIMARY KEY ("id"));
CREATE TABLE "RateAlertPreference" ("id" TEXT NOT NULL,"customerId" TEXT NOT NULL,"metal" "MetalType" NOT NULL,"alertType" "RateAlertType" NOT NULL,"targetPricePaise" BIGINT,"citySlug" TEXT,"enabled" BOOLEAN NOT NULL DEFAULT false,"lastTriggeredAt" TIMESTAMP(3),"lastRatePaise" BIGINT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "RateAlertPreference_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ProductCostAudit" ("id" TEXT NOT NULL,"productId" TEXT NOT NULL,"adminUserId" TEXT NOT NULL,"beforeJson" JSONB NOT NULL,"afterJson" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "ProductCostAudit_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "NotificationOutbox_deduplicationKey_key" ON "NotificationOutbox"("deduplicationKey");
CREATE INDEX "NotificationOutbox_channel_status_scheduledAt_idx" ON "NotificationOutbox"("channel","status","scheduledAt");
CREATE INDEX "NotificationOutbox_customerId_createdAt_idx" ON "NotificationOutbox"("customerId","createdAt");
CREATE UNIQUE INDEX "PushDeviceToken_token_key" ON "PushDeviceToken"("token");
CREATE INDEX "PushDeviceToken_customerId_isActive_lastSeenAt_idx" ON "PushDeviceToken"("customerId","isActive","lastSeenAt");
CREATE UNIQUE INDEX "CustomerNotificationPreference_customerId_key" ON "CustomerNotificationPreference"("customerId");
CREATE UNIQUE INDEX "RateAlertPreference_customerId_metal_alertType_citySlug_key" ON "RateAlertPreference"("customerId","metal","alertType","citySlug");
CREATE INDEX "RateAlertPreference_metal_alertType_enabled_idx" ON "RateAlertPreference"("metal","alertType","enabled");
CREATE INDEX "ProductCostAudit_productId_createdAt_idx" ON "ProductCostAudit"("productId","createdAt");
CREATE INDEX "ShopOrder_createdAt_idx" ON "ShopOrder"("createdAt");
CREATE INDEX "ShopOrder_paidAt_idx" ON "ShopOrder"("paidAt");
CREATE INDEX "ShopOrder_deliveredAt_idx" ON "ShopOrder"("deliveredAt");
CREATE INDEX "ShopOrder_orderStatus_createdAt_idx" ON "ShopOrder"("orderStatus","createdAt");
CREATE INDEX "ShopOrder_paymentStatus_paidAt_idx" ON "ShopOrder"("paymentStatus","paidAt");
CREATE INDEX "ShopOrder_metalType_createdAt_idx" ON "ShopOrder"("metalType","createdAt");
CREATE INDEX "ShopOrder_courierName_shipmentStatus_idx" ON "ShopOrder"("courierName","shipmentStatus");

ALTER TABLE "NotificationOutbox" ADD CONSTRAINT "NotificationOutbox_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushDeviceToken" ADD CONSTRAINT "PushDeviceToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerNotificationPreference" ADD CONSTRAINT "CustomerNotificationPreference_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RateAlertPreference" ADD CONSTRAINT "RateAlertPreference_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCostAudit" ADD CONSTRAINT "ProductCostAudit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductCostAudit" ADD CONSTRAINT "ProductCostAudit_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
