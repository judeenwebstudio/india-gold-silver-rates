import { NextResponse } from "next/server";

import { CityRateDataError, getCityDisplayRates } from "@/lib/city-rate-service";

export const dynamic = "force-dynamic";

type CityRateRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: CityRateRouteProps) {
  const { slug } = await params;

  try {
    const snapshot = await getCityDisplayRates(slug);
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    if (error instanceof CityRateDataError && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    const message = error instanceof CityRateDataError
      ? error.message
      : "City rates are temporarily unavailable.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
