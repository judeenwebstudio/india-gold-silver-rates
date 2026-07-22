import { NextResponse } from "next/server";

import { CityRateDataError, getLatestNationalBaseRates } from "@/lib/city-rate-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getLatestNationalBaseRates();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    const message = error instanceof CityRateDataError
      ? error.message
      : "National rates are temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
