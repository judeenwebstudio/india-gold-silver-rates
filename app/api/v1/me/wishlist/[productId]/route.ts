import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const auth = await authenticateSchemeUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
    }

    const { productId } = await context.params;
    if (!productId) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "productId is required" } }, { status: 400 });
    }

    await prisma.customerWishlist.deleteMany({
      where: { customerId: auth.userId, productId },
    });

    return NextResponse.json({ success: true, data: { removed: true, productId } });
  } catch (error: any) {
    console.error("DELETE /api/v1/me/wishlist/[productId] error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to remove from wishlist" } }, { status: 500 });
  }
}
