import { NextResponse } from "next/server";

import { getPublicLocations } from "@/lib/city-rate-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const states = await getPublicLocations();
    return NextResponse.json(
      { states },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Active locations are temporarily unavailable." },
      { status: 503 },
    );
  }
}
