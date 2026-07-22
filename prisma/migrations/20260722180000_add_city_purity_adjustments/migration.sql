-- Replace the legacy one-size-fits-all adjustment with purity-specific values.
ALTER TABLE "City"
ADD COLUMN "gold24KAdjustment" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN "gold22KAdjustment" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN "gold18KAdjustment" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN "gold14KAdjustment" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN "silver999Adjustment" DECIMAL(12,4) NOT NULL DEFAULT 0,
ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Preserve existing city intent before the seed applies the new per-purity values.
UPDATE "City"
SET
  "gold24KAdjustment" = "adjustmentAmount",
  "gold22KAdjustment" = "adjustmentAmount",
  "gold18KAdjustment" = "adjustmentAmount",
  "gold14KAdjustment" = "adjustmentAmount",
  "silver999Adjustment" = ROUND("adjustmentAmount" / 100, 4);

ALTER TABLE "City" DROP COLUMN "adjustmentAmount";

CREATE INDEX "City_isActive_deletedAt_idx" ON "City"("isActive", "deletedAt");
