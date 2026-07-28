import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateShopPrice, getTrichyShopRates } from '@/lib/shop';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [products, rates] = await Promise.all([
      prisma.shopProduct.findMany({ where: { isActive: true }, orderBy: { metalType: 'asc' }, omit: { imageData: true } }),
      getTrichyShopRates(),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        location: 'Tiruchirappalli (Trichy), Tamil Nadu',
        source: rates.source,
        recordedAt: rates.recordedAt,
        products: products.map((product) => {
          const rate = product.metalType === 'GOLD' ? rates.gold22kPerGramPaise : rates.silver999PerGramPaise;
          const weights = product.availableWeightsGramsJson as number[];
          return {
            id: product.id, productId: product.id, slug: product.slug, name: product.name, metalType: product.metalType,
            purity: product.purity, description: product.description,
            imageUrl: product.imageMimeType ? `/api/v1/shop/products/${product.id}/image` : product.imageUrl || (product.metalType === 'GOLD' ? '/products/gold-22k-coin.webp' : '/products/silver-coin.webp'),
            weights, availableWeights: weights, serviceChargePercent: product.serviceChargeBasisPoints / 100,
            enabled: product.isActive,
            gstPercent: product.gstBasisPoints / 100, ratePerGram: Number(rate) / 100,
            prices: Object.fromEntries(weights.map((weight) => {
              const price = calculateShopPrice(rate, weight, 1, product.serviceChargeBasisPoints, product.gstBasisPoints);
              return [String(weight), {
                metalValue: Number(price.metalValuePaise) / 100,
                serviceCharge: Number(price.serviceChargePaise) / 100,
                gst: Number(price.gstPaise) / 100,
                total: Number(price.totalPaise) / 100,
              }];
            })),
          };
        }),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : 'Shop is temporarily unavailable.' } }, { status: 503 });
  }
}
