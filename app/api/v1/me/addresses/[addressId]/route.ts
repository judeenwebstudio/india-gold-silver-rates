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
  const count = await prisma.deliveryAddress.count({ where: { userId: record.auth.userId } });
  if (count <= 1) return NextResponse.json({ success: false, error: { code: "LAST_ADDRESS", message: "Add another valid address before deleting your only saved address." } }, { status: 409 });
  await prisma.$transaction(async (tx) => {
    await tx.deliveryAddress.delete({ where: { id: addressId } });
    if (record.address.isDefault) {
      const replacement = await tx.deliveryAddress.findFirst({ where: { userId: record.auth.userId }, orderBy: { updatedAt: "desc" } });
      if (replacement) await tx.deliveryAddress.update({ where: { id: replacement.id }, data: { isDefault: true } });
    }
  });
  return NextResponse.json({ success: true });
}
