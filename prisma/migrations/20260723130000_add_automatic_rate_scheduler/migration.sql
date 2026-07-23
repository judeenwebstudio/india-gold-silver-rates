ALTER TYPE "RateUpdateStatus" ADD VALUE IF NOT EXISTS 'NO_CHANGE';

CREATE TYPE "RateSyncExecutionType" AS ENUM (
  'MANUAL_TEST',
  'MANUAL_SYNC',
  'AUTOMATIC_CRON'
);

ALTER TABLE "RateUpdateLog"
ADD COLUMN "executionType" "RateSyncExecutionType" NOT NULL DEFAULT 'MANUAL_SYNC',
ADD COLUMN "changedRates" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "durationMs" INTEGER,
ADD COLUMN "sourceRecordedAt" TIMESTAMP(3);

UPDATE "RateUpdateLog"
SET "executionType" = 'MANUAL_TEST'
WHERE "rawData" ->> 'mode' = 'TEST';

CREATE INDEX "RateUpdateLog_executionType_createdAt_idx"
ON "RateUpdateLog"("executionType", "createdAt");

CREATE INDEX "RateUpdateLog_executionType_status_createdAt_idx"
ON "RateUpdateLog"("executionType", "status", "createdAt");

CREATE TABLE "RateSyncLock" (
  "key" TEXT NOT NULL,
  "ownerToken" TEXT NOT NULL,
  "acquiredAt" TIMESTAMP(3) NOT NULL,
  "lockedUntil" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateSyncLock_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateSyncLock_lockedUntil_idx"
ON "RateSyncLock"("lockedUntil");
