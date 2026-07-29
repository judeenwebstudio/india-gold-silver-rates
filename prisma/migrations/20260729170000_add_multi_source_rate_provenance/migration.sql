CREATE TYPE "RateProvider" AS ENUM ('GOODRETURNS', 'IBJA', 'BANKBAZAAR', 'MCX', 'PREVIOUS_VERIFIED_RATE', 'OTHER');
CREATE TYPE "RateSourceType" AS ENUM ('SOURCE_PUBLISHED_CITY_RATE', 'MARKET_REFERENCE_RATE', 'EXCHANGE_BENCHMARK', 'INDICATIVE_CALCULATED_RATE', 'PREVIOUS_VERIFIED_RATE');
CREATE TYPE "RateSourceUnit" AS ENUM ('PER_GRAM', 'PER_10_GRAMS', 'PER_KILOGRAM');
CREATE TYPE "RateValidationStatus" AS ENUM ('VALID', 'REJECTED', 'FALLBACK');

ALTER TABLE "MetalRate"
ADD COLUMN "provider" "RateProvider",
ADD COLUMN "sourceType" "RateSourceType",
ADD COLUMN "sourceValue" DECIMAL(18,4),
ADD COLUMN "sourceUnit" "RateSourceUnit",
ADD COLUMN "normalizedPer10Grams" DECIMAL(18,4),
ADD COLUMN "normalizedPerKg" DECIMAL(18,4),
ADD COLUMN "conversionApplied" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "conversionFormula" TEXT,
ADD COLUMN "rateDate" TIMESTAMP(3),
ADD COLUMN "sourcePublishedAt" TIMESTAMP(3),
ADD COLUMN "fetchedAt" TIMESTAMP(3),
ADD COLUMN "lastSuccessfulSync" TIMESTAMP(3),
ADD COLUMN "validationStatus" "RateValidationStatus",
ADD COLUMN "validationMessage" TEXT,
ADD COLUMN "sourceReference" TEXT,
ADD COLUMN "rawResponseHash" TEXT,
ADD COLUMN "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "fallbackReason" TEXT,
ADD COLUMN "originalProvider" "RateProvider",
ADD COLUMN "originalRateDate" TIMESTAMP(3);

UPDATE "MetalRate"
SET "provider" = CASE
  WHEN upper("source") LIKE '%IBJA%' THEN 'IBJA'::"RateProvider"
  ELSE 'OTHER'::"RateProvider"
END,
"sourceType" = 'MARKET_REFERENCE_RATE',
"rateDate" = "recordedAt",
"sourcePublishedAt" = "recordedAt",
"lastSuccessfulSync" = "updatedAt",
"validationStatus" = 'VALID',
"originalProvider" = CASE
  WHEN upper("source") LIKE '%IBJA%' THEN 'IBJA'::"RateProvider"
  ELSE 'OTHER'::"RateProvider"
END,
"originalRateDate" = "recordedAt";

CREATE INDEX "MetalRate_provider_sourceType_recordedAt_idx" ON "MetalRate"("provider", "sourceType", "recordedAt");
CREATE INDEX "MetalRate_fallbackUsed_recordedAt_idx" ON "MetalRate"("fallbackUsed", "recordedAt");
