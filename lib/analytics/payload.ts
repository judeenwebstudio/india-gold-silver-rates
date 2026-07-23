import { z } from "zod";

const optionalLabel = z.string().trim().min(1).max(120).nullable().optional();

export const analyticsEventSchema = z.object({
  eventKey: z.uuid(),
  eventType: z.enum(["PAGE_VIEW", "CITY_VIEW"]),
  path: z.string().trim().startsWith("/").max(240),
  pageTitle: z.string().trim().min(1).max(180).nullable().optional(),
  citySlug: optionalLabel,
  cityName: optionalLabel,
  stateSlug: optionalLabel,
  stateName: optionalLabel,
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

export function isPublicAnalyticsPath(path: string) {
  return (
    path.startsWith("/") &&
    !path.startsWith("/admin") &&
    !path.startsWith("/api/")
  );
}
