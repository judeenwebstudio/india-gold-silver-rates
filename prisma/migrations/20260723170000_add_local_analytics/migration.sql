-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'CITY_VIEW');

-- CreateTable
CREATE TABLE "AnalyticsVisitor" (
    "id" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSession" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReturning" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AnalyticsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "eventType" "AnalyticsEventType" NOT NULL DEFAULT 'PAGE_VIEW',
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "pageTitle" TEXT,
    "citySlug" TEXT,
    "cityName" TEXT,
    "stateSlug" TEXT,
    "stateName" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsVisitor_visitorKey_key" ON "AnalyticsVisitor"("visitorKey");

-- CreateIndex
CREATE INDEX "AnalyticsVisitor_firstSeenAt_idx" ON "AnalyticsVisitor"("firstSeenAt");

-- CreateIndex
CREATE INDEX "AnalyticsVisitor_lastSeenAt_idx" ON "AnalyticsVisitor"("lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSession_sessionKey_key" ON "AnalyticsSession"("sessionKey");

-- CreateIndex
CREATE INDEX "AnalyticsSession_visitorId_startedAt_idx" ON "AnalyticsSession"("visitorId", "startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_startedAt_idx" ON "AnalyticsSession"("startedAt");

-- CreateIndex
CREATE INDEX "AnalyticsSession_isReturning_startedAt_idx" ON "AnalyticsSession"("isReturning", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEvent_eventKey_key" ON "AnalyticsEvent"("eventKey");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_recordedAt_idx" ON "AnalyticsEvent"("eventType", "recordedAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorId_recordedAt_idx" ON "AnalyticsEvent"("visitorId", "recordedAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_recordedAt_idx" ON "AnalyticsEvent"("sessionId", "recordedAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_path_eventType_recordedAt_idx" ON "AnalyticsEvent"("path", "eventType", "recordedAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_citySlug_recordedAt_idx" ON "AnalyticsEvent"("citySlug", "recordedAt");

-- AddForeignKey
ALTER TABLE "AnalyticsSession" ADD CONSTRAINT "AnalyticsSession_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "AnalyticsVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "AnalyticsVisitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AnalyticsSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
