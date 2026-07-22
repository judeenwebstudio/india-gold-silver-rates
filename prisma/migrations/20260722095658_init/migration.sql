-- CreateEnum
CREATE TYPE "MetalType" AS ENUM ('GOLD', 'SILVER');

-- CreateEnum
CREATE TYPE "MetalPurity" AS ENUM ('24K', '22K', '18K', '14K', '999', '925');

-- CreateEnum
CREATE TYPE "RateUpdateStatus" AS ENUM ('SUCCESS', 'FAILED', 'REJECTED');

-- CreateTable
CREATE TABLE "State" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "adjustmentAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetalRate" (
    "id" TEXT NOT NULL,
    "metalType" "MetalType" NOT NULL,
    "purity" "MetalPurity" NOT NULL,
    "pricePerGram" DECIMAL(14,2) NOT NULL,
    "pricePerKilogram" DECIMAL(16,2),
    "cityId" TEXT,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetalRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateUpdateLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "RateUpdateStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateUpdateLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "State_slug_key" ON "State"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "State_code_key" ON "State"("code");

-- CreateIndex
CREATE INDEX "State_isActive_name_idx" ON "State"("isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "City_slug_key" ON "City"("slug");

-- CreateIndex
CREATE INDEX "City_stateId_isActive_idx" ON "City"("stateId", "isActive");

-- CreateIndex
CREATE INDEX "City_isActive_name_idx" ON "City"("isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "City_stateId_name_key" ON "City"("stateId", "name");

-- CreateIndex
CREATE INDEX "MetalRate_metalType_purity_recordedAt_idx" ON "MetalRate"("metalType", "purity", "recordedAt");

-- CreateIndex
CREATE INDEX "MetalRate_cityId_recordedAt_idx" ON "MetalRate"("cityId", "recordedAt");

-- CreateIndex
CREATE INDEX "MetalRate_source_recordedAt_idx" ON "MetalRate"("source", "recordedAt");

-- CreateIndex
CREATE INDEX "MetalRate_recordedAt_idx" ON "MetalRate"("recordedAt");

-- CreateIndex
CREATE INDEX "RateUpdateLog_status_createdAt_idx" ON "RateUpdateLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RateUpdateLog_source_createdAt_idx" ON "RateUpdateLog"("source", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetalRate" ADD CONSTRAINT "MetalRate_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;
