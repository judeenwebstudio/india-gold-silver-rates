import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { paiseToInrNumber, inrToPaise } from '@/lib/schemes/precision';

export async function GET() {
  try {
    const plans = await prisma.schemePlan.findMany({
      include: {
        coinDenominations: {
          orderBy: { weightMilligrams: 'asc' },
        },
        enrollments: {
          select: {
            monthlyAmountPaise: true,
            paidInstallmentCount: true,
            eligiblePurchaseBalancePaise: true,
          },
        },
      },
      orderBy: [{ metalType: 'asc' }, { tenureMonths: 'asc' }],
    });

    const formattedPlans = plans.map((p) => {
      const memberCount = p.enrollments.length;
      const totalCollectionsPaise = p.enrollments.reduce(
        (sum, enc) => sum + enc.monthlyAmountPaise * BigInt(enc.paidInstallmentCount),
        0n
      );

      return {
        id: p.id,
        name: p.name,
        metalType: p.metalType,
        purity: p.purity,
        tenureMonths: p.tenureMonths,
        minMonthlyAmount: paiseToInrNumber(p.minMonthlyAmountPaise),
        maxMonthlyAmount: paiseToInrNumber(p.maxMonthlyAmountPaise),
        presetAmounts: (p.presetAmountsJson as number[]).map((a) => a / 100),
        gracePeriodDays: p.gracePeriodDays,
        termsVersion: p.termsVersion,
        isActive: p.isActive,
        visibility: p.visibility,
        version: p.version,
        memberCount,
        totalCollectionsInr: paiseToInrNumber(totalCollectionsPaise),
        coinDenominations: p.coinDenominations.map((d) => ({
          id: d.id,
          title: d.title,
          weightGrams: Number(d.weightMilligrams) / 1000,
          inStock: d.inStock,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        plans: formattedPlans,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch admin scheme plans' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { planId, isActive, minMonthlyAmount, maxMonthlyAmount } = body;

    if (!planId) {
      return NextResponse.json(
        { success: false, error: { message: 'planId is required' } },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof minMonthlyAmount === 'number') updateData.minMonthlyAmountPaise = inrToPaise(minMonthlyAmount);
    if (typeof maxMonthlyAmount === 'number') updateData.maxMonthlyAmountPaise = inrToPaise(maxMonthlyAmount);

    const updated = await prisma.schemePlan.update({
      where: { id: planId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        plan: {
          id: updated.id,
          name: updated.name,
          isActive: updated.isActive,
          minMonthlyAmount: paiseToInrNumber(updated.minMonthlyAmountPaise),
          maxMonthlyAmount: paiseToInrNumber(updated.maxMonthlyAmountPaise),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to update scheme plan' } },
      { status: 500 }
    );
  }
}
