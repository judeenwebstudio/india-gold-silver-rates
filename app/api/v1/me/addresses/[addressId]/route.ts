import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";
import { addressSchema } from "../route";

async function owned(request: Request, addressId: string) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return null;
  const address = await prisma.deliveryAddress.findFirst({ where: { id: addressId, userId: auth.userId } });
  return address ? { auth, address } : null;
}

export async function PUT(request: Request, context: { params: Promise<{ addressId: string }> }) {
  const { addressId } = await context.params;
  const record = await owned(request, addressId);
  if (!record) return NextResponse.json({ success: false, error: { message: "Address not found." } }, { status: 404 });
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: parsed.error.issues[0]?.message || "Invalid address." } }, { status: 400 });
  const address = await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault) await tx.deliveryAddress.updateMany({ where: { userId: record.auth.userId }, data: { isDefault: false } });
    return tx.deliveryAddress.update({ where: { id: addressId }, data: parsed.data });
  });
  return NextResponse.json({ success: true, data: address });
}

export async function DELETE(request: Request, context: { params: Promise<{ addressId: string }> }) {
  const { addressId } = await context.params;
  const record = await owned(request, addressId);
  if (!record) return NextResponse.json({ success: false, error: { message: "Address not found." } }, { status: 404 });
  await prisma.deliveryAddress.delete({ where: { id: addressId } });
  return NextResponse.json({ success: true });
}
