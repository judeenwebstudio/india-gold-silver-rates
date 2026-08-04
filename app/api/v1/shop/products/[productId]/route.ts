import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;
    if (!productId) {
      return NextResponse.json({ success: false, error: { code: "BAD_REQUEST", message: "productId is required" } }, { status: 400 });
    }

    const product = await prisma.shopProduct.findFirst({
      where: {
        OR: [
          { id: productId },
          { slug: productId },
        ],
        isActive: true,
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Product not found" } }, { status: 404 });
    }

    const dto = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      metalType: product.metalType,
      purity: product.purity,
      description: product.description,
      imageUrl: product.imageUrl,
      availableWeights: product.availableWeightsGramsJson,
      serviceChargePercent: product.serviceChargeBasisPoints / 100,
      gstPercent: product.gstBasisPoints / 100,
      enabled: product.isActive,
    };

    return NextResponse.json({ success: true, data: dto });
  } catch (error: any) {
    console.error("GET /api/v1/shop/products/[productId] error:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch product details" } }, { status: 500 });
  }
}
