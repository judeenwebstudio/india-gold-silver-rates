ALTER TABLE "SchemeUser" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "SchemeUser"
  ADD COLUMN "mobileVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "preferredLoginMethod" TEXT NOT NULL DEFAULT 'MOBILE',
  ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

UPDATE "SchemeUser"
SET "mobileVerifiedAt" = COALESCE("mobileVerifiedAt", "createdAt"),
    "preferredLoginMethod" = 'MOBILE'
WHERE "phone" IS NOT NULL;

CREATE TABLE "EmailAuthToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "resendAvailableAt" TIMESTAMP(3) NOT NULL,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailAuthToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailAuthToken_tokenHash_key" ON "EmailAuthToken"("tokenHash");
CREATE INDEX "EmailAuthToken_userId_purpose_createdAt_idx" ON "EmailAuthToken"("userId", "purpose", "createdAt");
CREATE INDEX "EmailAuthToken_email_purpose_createdAt_idx" ON "EmailAuthToken"("email", "purpose", "createdAt");
