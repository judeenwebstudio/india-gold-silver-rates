ALTER TABLE "ShopOrder"
  ADD COLUMN "courierPartner" TEXT,
  ADD COLUMN "trackingNumber" TEXT,
  ADD COLUMN "shipmentStatus" TEXT,
  ADD COLUMN "expectedDeliveryAt" TIMESTAMP(3),
  ADD COLUMN "shipmentTimelineJson" JSONB,
  ADD COLUMN "shiprocketOrderId" TEXT,
  ADD COLUMN "shiprocketShipmentId" TEXT;

CREATE INDEX "ShopOrder_trackingNumber_idx" ON "ShopOrder"("trackingNumber");
CREATE INDEX "ShopOrder_shipmentStatus_idx" ON "ShopOrder"("shipmentStatus");
