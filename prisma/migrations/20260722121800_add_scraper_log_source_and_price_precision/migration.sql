-- Store silver per-gram conversions without losing the third decimal place.
ALTER TABLE "MetalRate"
ALTER COLUMN "pricePerGram" SET DATA TYPE DECIMAL(14, 4);

-- Keep the configured public source directly queryable on every attempt log.
ALTER TABLE "RateUpdateLog"
ADD COLUMN "sourceUrl" TEXT;

CREATE INDEX "RateUpdateLog_sourceUrl_createdAt_idx"
ON "RateUpdateLog"("sourceUrl", "createdAt");
