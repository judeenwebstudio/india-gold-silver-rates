import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acceptsDeletionOrigin, deletionRequestReceived, deletionRequestSchema, readDeletionRequest } from "@/lib/account-deletion";
import { storeDeletionRequest } from "@/lib/account-deletion-intake";

export const runtime = "nodejs";
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!acceptsDeletionOrigin(request)) return reply({ error: "Please submit the form from the RateStack website." }, 403);
  const parsed = deletionRequestSchema.safeParse(await readDeletionRequest(request).catch(() => null));
  if (!parsed.success) return reply({ error: "Enter your registered email address or Indian mobile number." }, 400);
  if (parsed.data.website) return reply({ message: deletionRequestReceived }, 202);
  const secret = process.env.AUTH_SECRET;
  if (!secret) return reply({ error: "Requests are temporarily unavailable. Please try again later or contact info@ratestack.in." }, 503);
  const hash = (value: string) => createHmac("sha256", secret).update(value).digest("hex");
  const contactHash = hash(`contact:${parsed.data.identifier}`);
  const ipHash = hash(`ip:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"}`);
  try {
    const result = await prisma.$transaction((tx) => storeDeletionRequest(tx, { identifier: parsed.data.identifier, contactHash, ipHash }));
    if (result === "LIMITED") return reply({ error: "Too many requests. Please try again in an hour or contact info@ratestack.in." }, 429);
    return reply({ message: deletionRequestReceived }, 202);
  } catch {
    // Do not log identifiers, request bodies, or database error details.
    console.error("Account deletion request storage failed");
    return reply({ error: "We could not save your request. Please try again later or contact info@ratestack.in." }, 503);
  }
}
