import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkMerchantGuard } from '@/lib/schemes/merchant-guard';
import { seedSchemeData } from '@/lib/schemes/seed-data';
import { paiseToInrNumber, milligramsToGrams, calculateMetalValuePaise } from '@/lib/schemes/precision';

export async function GET() {
  try {
    // 1. Check if seed data exists, if not seed defaults
    const count = await prisma.schemePlan.count();
    if (count === 0) {
      await seedSchemeData();
    }

    // 2. Merchant Guard status
    const merchantStatus = await checkMerchantGuard();

    // 3. Fetch Plans
    const plans = await prisma.schemePlan.findMany({
      where: { isActive: true, visibility: true },
      include: {
        coinDenominations: {
          where: { inStock: true },
          orderBy: { weightMilligrams: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 4. Fetch latest rates
    const goldRate = await prisma.metalRate.findFirst({
      where: { metalType: 'GOLD', purity: 'K22', isActive: true },
      orderBy: { recordedAt: 'desc' },
    });

    const silverRate = await prisma.metalRate.findFirst({
      where: { metalType: 'SILVER', purity: 'P999', isActive: true },
      orderBy: { recordedAt: 'desc' },
    });

    const goldPricePerGramPaise = goldRate ? BigInt(Math.round(Number(goldRate.pricePerGram) * 100)) : 750000n; // Fallback ~₹7,500/g
    const silverPricePerGramPaise = silverRate ? BigInt(Math.round(Number(silverRate.pricePerGram) * 100)) : 9000n; // Fallback ~₹90/g

    const serializedPlans = plans.map((plan) => {
      const minMonthlyInr = paiseToInrNumber(plan.minMonthlyAmountPaise);
      const maxMonthlyInr = paiseToInrNumber(plan.maxMonthlyAmountPaise);
      const presetInr = (plan.presetAmountsJson as number[]).map((p) => p / 100);

      const ratePaise = plan.metalType === 'GOLD' ? goldPricePerGramPaise : silverPricePerGramPaise;

      // Smallest available coin denomination for this plan
      const smallestDenom = plan.coinDenominations[0];
      let minCoinEstPriceInr = 0;
      if (smallestDenom) {
        const metalValPaise = calculateMetalValuePaise(ratePaise, smallestDenom.weightMilligrams);
        const taxable = metalValPaise + smallestDenom.mintingFeePaise + smallestDenom.packagingFeePaise;
        const totalPaise = taxable + (taxable * 3n) / 100n;
        minCoinEstPriceInr = paiseToInrNumber(totalPaise);
      }

      return {
        id: plan.id,
        name: plan.name,
        metalType: plan.metalType,
        purity: plan.purity,
        tenureMonths: plan.tenureMonths,
        minMonthlyAmount: minMonthlyInr,
        maxMonthlyAmount: maxMonthlyInr,
        presetAmounts: presetInr,
        gracePeriodDays: plan.gracePeriodDays,
        termsVersion: plan.termsVersion,
        kycRequired: plan.kycRequired,
        version: plan.version,
        coinDenominations: plan.coinDenominations.map((d) => ({
          id: d.id,
          title: d.title,
          weightGrams: milligramsToGrams(d.weightMilligrams),
          mintingFee: paiseToInrNumber(d.mintingFeePaise),
          packagingFee: paiseToInrNumber(d.packagingFeePaise),
          inStock: d.inStock,
        })),
        minCoinEstPriceInr,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        plans: serializedPlans,
        merchantGuard: merchantStatus,
        prevailingRates: {
          gold22kPerGram: paiseToInrNumber(goldPricePerGramPaise),
          silver999PerGram: paiseToInrNumber(silverPricePerGramPaise),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch schemes' } },
      { status: 500 }
    );
  }
}
