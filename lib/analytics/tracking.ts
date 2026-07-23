import { randomUUID } from "node:crypto";

import { AnalyticsEventType } from "@/generated/prisma/client";
import type { AnalyticsEventInput } from "@/lib/analytics/payload";
import { prisma } from "@/lib/prisma";

type RecordAnalyticsEventOptions = {
  visitorKey: string;
  sessionKey: string;
  event: AnalyticsEventInput;
};

export async function recordAnalyticsEvent({
  visitorKey,
  sessionKey,
  event,
}: RecordAnalyticsEventOptions) {
  return prisma.$transaction(async (transaction) => {
    const duplicate = await transaction.analyticsEvent.findUnique({
      where: { eventKey: event.eventKey },
      select: { id: true },
    });

    if (duplicate) {
      return { created: false, visitorKey, sessionKey };
    }

    const existingVisitor = await transaction.analyticsVisitor.findUnique({
      where: { visitorKey },
      select: { id: true },
    });

    const visitor = await transaction.analyticsVisitor.upsert({
      where: { visitorKey },
      create: { visitorKey },
      update: { lastSeenAt: new Date() },
      select: { id: true },
    });

    const cookieSession = await transaction.analyticsSession.findUnique({
      where: { sessionKey },
      select: { id: true, visitorId: true },
    });
    const effectiveSessionKey =
      cookieSession && cookieSession.visitorId !== visitor.id
        ? randomUUID()
        : sessionKey;
    const existingSession =
      effectiveSessionKey === sessionKey ? cookieSession : null;

    const session = existingSession
      ? await transaction.analyticsSession.update({
          where: { id: existingSession.id },
          data: { lastSeenAt: new Date() },
          select: { id: true },
        })
      : await transaction.analyticsSession.create({
          data: {
            sessionKey: effectiveSessionKey,
            visitorId: visitor.id,
            isReturning: Boolean(existingVisitor),
          },
          select: { id: true },
        });

    await transaction.analyticsEvent.create({
      data: {
        eventKey: event.eventKey,
        eventType:
          event.eventType === "CITY_VIEW"
            ? AnalyticsEventType.CITY_VIEW
            : AnalyticsEventType.PAGE_VIEW,
        visitorId: visitor.id,
        sessionId: session.id,
        path: event.path,
        pageTitle: event.pageTitle ?? null,
        citySlug: event.citySlug ?? null,
        cityName: event.cityName ?? null,
        stateSlug: event.stateSlug ?? null,
        stateName: event.stateName ?? null,
      },
    });

    return {
      created: true,
      visitorKey,
      sessionKey: effectiveSessionKey,
    };
  });
}
