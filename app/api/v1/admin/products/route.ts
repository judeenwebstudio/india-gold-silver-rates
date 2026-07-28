import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  id: z.string(), description: z.string().min(1), imageUrl: z.string().url().nullable().optional(),
  weights: z.array(z.number().positive()).min(1), serviceChargePercent: z.number().min(0).max(100),
  gstPercent: z.number().min(0).max(100), isActive: z.boolean(),
});
export async function GET() {
  if (!(await auth())?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const products = await prisma.shopProduct.findMany({ orderBy: { metalType: 'asc' }, omit: { imageData: true } });
  return NextResponse.json({ products: products.map((p) => ({ ...p, imageUrl: p.imageMimeType ? `/api/v1/shop/products/${p.id}/image` : p.imageUrl, weights: p.availableWeightsGramsJson, serviceChargePercent: p.serviceChargeBasisPoints / 100, gstPercent: p.gstBasisPoints / 100 })) });
}
export async function PUT(request: Request) {
  if (!(await auth())?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  if (parsed.data.imageUrl && !/^\/(?:products|api\/v1\/shop\/products)\/[a-zA-Z0-9_./-]+$/.test(parsed.data.imageUrl)) {
    return NextResponse.json({ error: 'Image URL must be a safe RateStack-hosted product path.' }, { status: 400 });
  }
  const product = await prisma.shopProduct.update({ where: { id: parsed.data.id }, data: {
    description: parsed.data.description, imageUrl: parsed.data.imageUrl || null,
    availableWeightsGramsJson: parsed.data.weights,
    serviceChargeBasisPoints: Math.round(parsed.data.serviceChargePercent * 100),
    gstBasisPoints: Math.round(parsed.data.gstPercent * 100), isActive: parsed.data.isActive,
  } });
  return NextResponse.json({ product });
}
