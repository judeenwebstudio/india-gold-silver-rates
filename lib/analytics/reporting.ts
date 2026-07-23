import { AnalyticsEventType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const REPORTING_WINDOW_DAYS = 30;

export type AnalyticsReport = {
  reportingWindowDays: number;
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  sessions: number;
  returningVisitors: number;
  mostVisitedPages: Array<{ path: string; views: number }>;
  mostViewedCities: Array<{
    citySlug: string;
    cityName: string;
    stateName: string | null;
    views: number;
  }>;
};

export async function getAnalyticsReport(
  now = new Date(),
): Promise<AnalyticsReport> {
  const reportingStart = new Date(
    now.getTime() - REPORTING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  const eventWindow = { recordedAt: { gte: reportingStart, lte: now } };

  const [
    totalVisitors,
    uniqueVisitors,
    pageViews,
    sessions,
    returningVisitors,
    pageGroups,
    cityGroups,
  ] = await Promise.all([
    prisma.analyticsVisitor.count(),
    prisma.analyticsVisitor.count({
      where: { lastSeenAt: { gte: reportingStart, lte: now } },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        ...eventWindow,
      },
    }),
    prisma.analyticsSession.count({
      where: { startedAt: { gte: reportingStart, lte: now } },
    }),
    prisma.analyticsVisitor.count({
      where: {
        sessions: {
          some: {
            isReturning: true,
            startedAt: { gte: reportingStart, lte: now },
          },
        },
      },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        ...eventWindow,
      },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 8,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["citySlug", "cityName", "stateName"],
      where: {
        citySlug: { not: null },
        cityName: { not: null },
        ...eventWindow,
      },
      _count: { _all: true },
      orderBy: { _count: { citySlug: "desc" } },
      take: 8,
    }),
  ]);

  return {
    reportingWindowDays: REPORTING_WINDOW_DAYS,
    totalVisitors,
    uniqueVisitors,
    pageViews,
    sessions,
    returningVisitors,
    mostVisitedPages: pageGroups.map((group) => ({
      path: group.path,
      views: group._count._all,
    })),
    mostViewedCities: cityGroups.flatMap((group) =>
      group.citySlug && group.cityName
        ? [
            {
              citySlug: group.citySlug,
              cityName: group.cityName,
              stateName: group.stateName,
              views: group._count._all,
            },
          ]
        : [],
    ),
  };
}
