import { NextRequest } from "next/server";
import { z } from "zod";
import { v1Error, v1Success } from "@/lib/api/v1/response";
import { getCityComparison } from "@/lib/city-rate-comparison";

const querySchema = z.object({
  metal: z.enum(["gold22k", "gold24k", "silver", "city"]).default("gold22k"),
  sort: z.enum(["asc"]).default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  rateType: z.enum(["ALL", "ORIGINAL", "INDICATIVE"]).default("ALL"),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return v1Error(400, "INVALID_QUERY", "Invalid city comparison query.");
  try {
    return v1Success(await getCityComparison({
      sort: parsed.data.metal,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      search: parsed.data.search,
      state: parsed.data.state,
      rateType: parsed.data.rateType,
    }), "rates");
  } catch {
    return v1Error(500, "CITY_RATES_UNAVAILABLE", "City comparison rates are temporarily unavailable.");
  }
}
