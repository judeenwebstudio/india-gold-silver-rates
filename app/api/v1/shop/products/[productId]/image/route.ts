import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const product = await prisma.shopProduct.findUnique({
    where: { id: productId },
    select: { imageData: true, imageMimeType: true },
  });
  if (!product?.imageData || !product.imageMimeType) return new NextResponse(null, { status: 404 });
  return new NextResponse(product.imageData, {
    headers: {
      'Content-Type': product.imageMimeType,
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
