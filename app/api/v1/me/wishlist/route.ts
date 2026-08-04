import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateSchemeUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
    }

    const items = await prisma.customerWishlist.findMany({
      where: { customerId: auth.userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });

    const products = items.map((item) => ({
      productId: item.product.id,
      slug: item.product.slug,
      name: item.product.name,
      metalType: item.product.metalType,
      purity: item.product.purity,
      description: item.product.description,
      imageUrl: item.product.imageUrl,
      availableWeights: item.product.availableWeightsGramsJson,
      serviceChargePercent: item.product.serviceChargeBasisPoints / 100,
      gstPercent: item.product.gstBasisPoints / 100,
      enabled: item.product.isActive,
    }));

    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error("GET /api/v1/me/wishlist error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch wishlist" } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateSchemeUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
    }

    const body = await req.json();
    const { productId } = body;
    if (!productId) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "productId is required" } }, { status: 400 });
    }

    const product = await prisma.shopProduct.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found or inactive" } }, { status: 404 });
    }

    await prisma.customerWishlist.upsert({
      where: { customerId_productId: { customerId: auth.userId, productId } },
      create: { customerId: auth.userId, productId },
      update: {},
    });

    return NextResponse.json({ success: true, data: { added: true, productId } });
  } catch (error: any) {
    console.error("POST /api/v1/me/wishlist error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to add to wishlist" } }, { status: 500 });
  }
}
