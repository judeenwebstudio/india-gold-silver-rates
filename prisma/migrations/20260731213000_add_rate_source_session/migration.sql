ALTER TABLE "MetalRate"
ADD COLUMN "sourceSession" VARCHAR(2);

CREATE INDEX "MetalRate_provider_cityId_purity_sourceSession_recordedAt_idx"
ON "MetalRate"("provider", "cityId", "purity", "sourceSession", "recordedAt");
