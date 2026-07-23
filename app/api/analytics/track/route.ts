import { randomUUID } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import {
  analyticsEventSchema,
  isPublicAnalyticsPath,
} from "@/lib/analytics/payload";
import { recordAnalyticsEvent } from "@/lib/analytics/tracking";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VISITOR_COOKIE = "igsr_visitor";
const SESSION_COOKIE = "igsr_session";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT_PATTERN =
  /bot|crawler|spider|slurp|headless|lighthouse|pagespeed|preview/i;

function getCookieIdentifier(value: string | undefined) {
  return value && UUID_PATTERN.test(value) ? value : randomUUID();
}

function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }

  if (
    request.headers.get("dnt") === "1" ||
    BOT_PATTERN.test(request.headers.get("user-agent") ?? "")
  ) {
    return new NextResponse(null, { status: 204 });
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = analyticsEventSchema.safeParse(rawBody);

  if (!parsed.success || !isPublicAnalyticsPath(parsed.data.path)) {
    return NextResponse.json({ message: "Invalid analytics event." }, { status: 400 });
  }

  const visitorKey = getCookieIdentifier(
    request.cookies.get(VISITOR_COOKIE)?.value,
  );
  const sessionKey = getCookieIdentifier(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  const result = await recordAnalyticsEvent({
    visitorKey,
    sessionKey,
    event: parsed.data,
  });

  const response = NextResponse.json(
    { tracked: result.created },
    { status: result.created ? 201 : 200 },
  );
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(VISITOR_COOKIE, result.visitorKey, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  response.cookies.set(SESSION_COOKIE, result.sessionKey, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 30 * 60,
  });

  return response;
}
