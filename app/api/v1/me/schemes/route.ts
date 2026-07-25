import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { paiseToInrNumber } from '@/lib/schemes/precision';

export async function GET(request: Request) {
  try {
    const authUser = await authenticateSchemeUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const enrollments = await prisma.schemeEnrollment.findMany({
      where: { userId: authUser.userId },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = enrollments.map((e) => {
      const paidPaise = BigInt(e.paidInstallmentCount) * e.monthlyAmountPaise;
      const progressPercent = Number(
        (paidPaise * 100n) / (e.totalScheduledAmountPaise || BigInt(1))
      );

      return {
        id: e.id,
        accountNumber: e.accountNumber,
        productName: e.plan.name,
        metalType: e.metalType,
        purity: e.purity,
        tenureMonths: e.tenureMonths,
        monthlyAmount: paiseToInrNumber(e.monthlyAmountPaise),
        totalScheduledAmount: paiseToInrNumber(e.totalScheduledAmountPaise),
        schemePurchaseBalance: paiseToInrNumber(e.eligiblePurchaseBalancePaise),
        paidInstallmentCount: e.paidInstallmentCount,
        remainingInstallmentCount: e.remainingInstallmentCount,
        nextDueDate: e.nextDueDate,
        overdueAmount: paiseToInrNumber(e.overdueAmountPaise),
        status: e.status,
        progressPercent,
        startDate: e.startDate,
        maturityDate: e.maturityDate,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch user schemes' } },
      { status: 500 }
    );
  }
}
