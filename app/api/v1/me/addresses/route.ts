import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";

export const addressSchema = z.object({
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional().default(""),
  landmark: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Enter a valid six-digit Indian PIN code."),
  country: z.literal("India").default("India"),
  addressType: z.enum(["HOME", "OFFICE", "OTHER"]).default("HOME"),
  isDefault: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: "Authentication required." } }, { status: 401 });
  const addresses = await prisma.deliveryAddress.findMany({ where: { userId: auth.userId }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] });
  return NextResponse.json({ success: true, data: addresses });
}

export async function POST(request: Request) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: "Authentication required." } }, { status: 401 });
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: parsed.error.issues[0]?.message || "Invalid address." } }, { status: 400 });
  const count = await prisma.deliveryAddress.count({ where: { userId: auth.userId } });
  const makeDefault = parsed.data.isDefault || count === 0;
  const address = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.deliveryAddress.updateMany({ where: { userId: auth.userId }, data: { isDefault: false } });
    return tx.deliveryAddress.create({ data: { ...parsed.data, isDefault: makeDefault, userId: auth.userId } });
  });
  return NextResponse.json({ success: true, data: address }, { status: 201 });
}
