import { NextResponse } from "next/server";

const API_VERSION = "v1";

type CacheProfile = "rates" | "locations";

const CACHE_CONTROL: Record<CacheProfile, string> = {
  rates: "public, max-age=60, stale-while-revalidate=300",
  locations: "public, max-age=300, stale-while-revalidate=3600",
};

function publicHeaders(cacheProfile?: CacheProfile) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": cacheProfile
      ? CACHE_CONTROL[cacheProfile]
      : "no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

export function v1Success<T>(
  data: T,
  cacheProfile: CacheProfile,
) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { apiVersion: API_VERSION },
    },
    { headers: publicHeaders(cacheProfile) },
  );
}

export function v1Error(
  status: number,
  code: string,
  message: string,
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message },
      meta: { apiVersion: API_VERSION },
    },
    {
      status,
      headers: publicHeaders(),
    },
  );
}
