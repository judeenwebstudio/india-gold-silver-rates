import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";

export async function POST(request: Request, context: { params: Promise<{ addressId: string }> }) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: "Authentication required." } }, { status: 401 });
  const { addressId } = await context.params;
  const address = await prisma.deliveryAddress.findFirst({ where: { id: addressId, userId: auth.userId } });
  if (!address) return NextResponse.json({ success: false, error: { message: "Address not found." } }, { status: 404 });
  try {
    const updated = await prisma.$transaction(async (tx) => {
      await tx.deliveryAddress.updateMany({ where: { userId: auth.userId }, data: { isDefault: false } });
      return tx.deliveryAddress.update({ where: { id: addressId }, data: { isDefault: true } });
    });
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: { code: "DEFAULT_ADDRESS_FAILED", message: "The default address could not be changed." } }, { status: 409 });
  }
}
