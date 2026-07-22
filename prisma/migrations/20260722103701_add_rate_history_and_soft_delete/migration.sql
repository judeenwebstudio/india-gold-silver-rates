-- CreateEnum
CREATE TYPE "RateHistoryAction" AS ENUM ('CREATE', 'UPDATE', 'SOFT_DELETE');

-- AlterTable
ALTER TABLE "MetalRate" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "RateHistory" (
    "id" TEXT NOT NULL,
    "metalRateId" TEXT NOT NULL,
    "metalType" "MetalType" NOT NULL,
    "action" "RateHistoryAction" NOT NULL,
    "previousData" JSONB,
    "newData" JSONB,
    "source" TEXT NOT NULL DEFAULT 'ADMIN_UI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateHistory_metalRateId_createdAt_idx" ON "RateHistory"("metalRateId", "createdAt");

-- CreateIndex
CREATE INDEX "RateHistory_metalType_action_createdAt_idx" ON "RateHistory"("metalType", "action", "createdAt");

-- CreateIndex
CREATE INDEX "RateHistory_createdAt_idx" ON "RateHistory"("createdAt");

-- CreateIndex
CREATE INDEX "MetalRate_metalType_isActive_recordedAt_idx" ON "MetalRate"("metalType", "isActive", "recordedAt");

-- CreateIndex
CREATE INDEX "MetalRate_isActive_recordedAt_idx" ON "MetalRate"("isActive", "recordedAt");

-- AddForeignKey
ALTER TABLE "RateHistory" ADD CONSTRAINT "RateHistory_metalRateId_fkey" FOREIGN KEY ("metalRateId") REFERENCES "MetalRate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
