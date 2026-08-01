CREATE TYPE "CustomerActivityPlatform" AS ENUM ('WEB', 'ANDROID');
CREATE TYPE "CustomerLoginMethod" AS ENUM ('MOBILE_PASSWORD', 'EMAIL_PASSWORD', 'GOOGLE', 'OTP', 'SESSION_RESTORE');

CREATE TABLE "CustomerPlatformActivity" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "platform" "CustomerActivityPlatform" NOT NULL,
    "loginMethod" "CustomerLoginMethod" NOT NULL,
    "deviceIdHash" TEXT,
    "appVersion" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "loggedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerPlatformActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CustomerPlatformActivity_customerId_platform_lastSeenAt_idx" ON "CustomerPlatformActivity"("customerId", "platform", "lastSeenAt");
CREATE INDEX "CustomerPlatformActivity_platform_lastSeenAt_idx" ON "CustomerPlatformActivity"("platform", "lastSeenAt");
CREATE INDEX "CustomerPlatformActivity_loginMethod_lastSeenAt_idx" ON "CustomerPlatformActivity"("loginMethod", "lastSeenAt");
CREATE INDEX "CustomerPlatformActivity_lastSeenAt_idx" ON "CustomerPlatformActivity"("lastSeenAt");
ALTER TABLE "CustomerPlatformActivity" ADD CONSTRAINT "CustomerPlatformActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "SchemeUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CustomerPlatformActivity" ("id", "customerId", "platform", "loginMethod", "appVersion", "loggedInAt", "lastSeenAt", "createdAt")
SELECT 'backfill_' || md5("id"), "customerId", 'ANDROID'::"CustomerActivityPlatform", 'SESSION_RESTORE'::"CustomerLoginMethod", "appVersion", "createdAt", "lastSeenAt", "createdAt"
FROM "PushDeviceToken"
WHERE "platform" = 'ANDROID' AND "customerId" IS NOT NULL;
