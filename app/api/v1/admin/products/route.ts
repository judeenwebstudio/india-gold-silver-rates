import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { customerShopWeights } from '@/lib/shop';
import { requireOrderAdmin } from '@/lib/admin-orders';

const schema = z.object({
  id: z.string(), description: z.string().min(1), imageUrl: z.string().url().nullable().optional(),
  weights: z.array(z.number().positive()).min(1), serviceChargePercent: z.number().min(0).max(100),
  gstPercent: z.number().min(0).max(100), isActive: z.boolean(),
  productCost: z.number().min(0).nullable().optional(), metalAcquisitionCost: z.number().min(0).nullable().optional(),
  packagingCost: z.number().min(0).nullable().optional(), shippingCost: z.number().min(0).nullable().optional(),
  gatewayFeePercent: z.number().min(0).max(100).nullable().optional(), otherCost: z.number().min(0).nullable().optional(),
});
type CostProduct={productCostPaise:bigint|null;metalAcquisitionCostPaise:bigint|null;packagingCostPaise:bigint|null;shippingCostPaise:bigint|null;gatewayFeeBasisPoints:number|null;otherCostPaise:bigint|null};
function serializeProduct<T extends CostProduct & object>(p:T){return {...p,productCostPaise:undefined,metalAcquisitionCostPaise:undefined,packagingCostPaise:undefined,shippingCostPaise:undefined,otherCostPaise:undefined,productCost:p.productCostPaise==null?null:Number(p.productCostPaise)/100,metalAcquisitionCost:p.metalAcquisitionCostPaise==null?null:Number(p.metalAcquisitionCostPaise)/100,packagingCost:p.packagingCostPaise==null?null:Number(p.packagingCostPaise)/100,shippingCost:p.shippingCostPaise==null?null:Number(p.shippingCostPaise)/100,gatewayFeePercent:p.gatewayFeeBasisPoints==null?null:p.gatewayFeeBasisPoints/100,otherCost:p.otherCostPaise==null?null:Number(p.otherCostPaise)/100}}
export async function GET() {
  if (!(await auth())?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const products = await prisma.shopProduct.findMany({ orderBy: { metalType: 'asc' }, omit: { imageData: true } });
  return NextResponse.json({ products: products.map((p) => Object.assign(serializeProduct(p), { imageUrl: p.imageMimeType ? `/api/v1/shop/products/${p.id}/image` : p.imageUrl, weights: customerShopWeights(p.metalType, p.availableWeightsGramsJson as number[]), serviceChargePercent: p.serviceChargeBasisPoints / 100, gstPercent: p.gstBasisPoints / 100 })) });
}
export async function PUT(request: Request) {
  if (!(await auth())?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  if (parsed.data.imageUrl && !/^\/(?:products|api\/v1\/shop\/products)\/[a-zA-Z0-9_./-]+$/.test(parsed.data.imageUrl)) {
    return NextResponse.json({ error: 'Image URL must be a safe RateStack-hosted product path.' }, { status: 400 });
  }
  const admin=await requireOrderAdmin("status");
  const existing = await prisma.shopProduct.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  const product = await prisma.shopProduct.update({ where: { id: parsed.data.id }, data: {
    description: parsed.data.description, imageUrl: parsed.data.imageUrl || null,
    availableWeightsGramsJson: customerShopWeights(existing.metalType, parsed.data.weights),
    serviceChargeBasisPoints: Math.round(parsed.data.serviceChargePercent * 100),
    gstBasisPoints: Math.round(parsed.data.gstPercent * 100), isActive: parsed.data.isActive,
    productCostPaise:parsed.data.productCost==null?null:BigInt(Math.round(parsed.data.productCost*100)),
    metalAcquisitionCostPaise:parsed.data.metalAcquisitionCost==null?null:BigInt(Math.round(parsed.data.metalAcquisitionCost*100)),
    packagingCostPaise:parsed.data.packagingCost==null?null:BigInt(Math.round(parsed.data.packagingCost*100)),
    shippingCostPaise:parsed.data.shippingCost==null?null:BigInt(Math.round(parsed.data.shippingCost*100)),
    gatewayFeeBasisPoints:parsed.data.gatewayFeePercent==null?null:Math.round(parsed.data.gatewayFeePercent*100),
    otherCostPaise:parsed.data.otherCost==null?null:BigInt(Math.round(parsed.data.otherCost*100)),
  } });
  const costKeys=["productCostPaise","metalAcquisitionCostPaise","packagingCostPaise","shippingCostPaise","gatewayFeeBasisPoints","otherCostPaise"] as const;
  await prisma.productCostAudit.create({data:{productId:product.id,adminUserId:admin.id,beforeJson:Object.fromEntries(costKeys.map(key=>[key,existing[key]?.toString()??null])),afterJson:Object.fromEntries(costKeys.map(key=>[key,product[key]?.toString()??null]))}});
  return NextResponse.json({ product:serializeProduct(product) });
}
