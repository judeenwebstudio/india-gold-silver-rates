CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'PASSWORD', 'MOBILE');

ALTER TABLE "SchemeUser"
  ALTER COLUMN "passwordHash" DROP NOT NULL,
  ADD COLUMN "profileImageUrl" TEXT;

CREATE TABLE "AuthAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "AuthProvider" NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "providerEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AuthAccount_provider_providerAccountId_key"
  ON "AuthAccount"("provider", "providerAccountId");
CREATE INDEX "AuthAccount_userId_provider_idx" ON "AuthAccount"("userId", "provider");
CREATE INDEX "AuthAccount_providerEmail_idx" ON "AuthAccount"("providerEmail");

INSERT INTO "AuthAccount" ("id", "userId", "provider", "providerAccountId", "providerEmail", "createdAt", "updatedAt")
SELECT 'password_' || "id", "id", 'PASSWORD'::"AuthProvider", LOWER("email"), LOWER("email"), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SchemeUser"
WHERE "email" IS NOT NULL AND "passwordHash" IS NOT NULL
ON CONFLICT ("provider", "providerAccountId") DO NOTHING;

INSERT INTO "AuthAccount" ("id", "userId", "provider", "providerAccountId", "createdAt", "updatedAt")
SELECT 'mobile_' || "id", "id", 'MOBILE'::"AuthProvider", "phone", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "SchemeUser"
WHERE "phone" IS NOT NULL
ON CONFLICT ("provider", "providerAccountId") DO NOTHING;
