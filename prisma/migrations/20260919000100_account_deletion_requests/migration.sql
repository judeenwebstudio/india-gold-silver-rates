CREATE TABLE "AccountDeletionRequest" (
  "id" TEXT NOT NULL,
  "identifier" TEXT,
  "contactHash" TEXT NOT NULL,
  "ipHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AccountDeletionRequest_status_check" CHECK ("status" IN ('PENDING', 'VERIFIED', 'CLOSED'))
);
CREATE INDEX "AccountDeletionRequest_status_createdAt_idx" ON "AccountDeletionRequest"("status", "createdAt");
CREATE INDEX "AccountDeletionRequest_contactHash_status_idx" ON "AccountDeletionRequest"("contactHash", "status");
CREATE INDEX "AccountDeletionRequest_ipHash_createdAt_idx" ON "AccountDeletionRequest"("ipHash", "createdAt");
