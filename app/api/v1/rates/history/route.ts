import { NextRequest } from "next/server";
import { z } from "zod";
import { v1Error, v1Success } from "@/lib/api/v1/response";
import { getStoredRateHistory } from "@/lib/rate-history";

const querySchema = z.object({
  city: z.string().trim().min(1).max(100).default("tiruchirappalli"),
  days: z.coerce.number().int().min(1).max(7).default(7),
  metal: z.enum(["gold24k", "gold22k", "silver"]).default("gold22k"),
  unit: z.enum(["gram", "kilogram"]).default("gram"),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return v1Error(400, "INVALID_QUERY", "Invalid history query.");
  if (parsed.data.metal !== "silver" && parsed.data.unit !== "gram") {
    return v1Error(400, "INVALID_UNIT", "Kilogram is available for silver only.");
  }
  try {
    return v1Success(await getStoredRateHistory({
      citySlug: parsed.data.city,
      days: parsed.data.days,
      metal: parsed.data.metal,
      unit: parsed.data.unit,
    }), "rates");
  } catch (error) {
    if (error instanceof Error && error.message === "City not found.") {
      return v1Error(404, "CITY_NOT_FOUND", error.message);
    }
    return v1Error(500, "HISTORY_UNAVAILABLE", "Stored rate history is temporarily unavailable.");
  }
}
