import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { paiseToInrNumber } from '@/lib/schemes/precision';

export async function GET(
  request: Request,
  context: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const { enrollmentId } = await context.params;

    const authUser = await authenticateSchemeUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const enrollment = await prisma.schemeEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        plan: {
          include: {
            coinDenominations: { where: { inStock: true }, orderBy: { weightMilligrams: 'asc' } },
          },
        },
        nominee: true,
        installments: { orderBy: { installmentNo: 'asc' } },
        receipts: { orderBy: { createdAt: 'desc' }, take: 5 },
        redemptionRequests: { include: { quotation: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!enrollment || enrollment.userId !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: { message: 'Scheme account not found' } },
        { status: 404 }
      );
    }

    const totalScheduled = enrollment.totalScheduledAmountPaise;
    const currentBalance = enrollment.eligiblePurchaseBalancePaise;
    const paidCount = enrollment.paidInstallmentCount;
    const remainingCount = enrollment.remainingInstallmentCount;
    const progressPercent = Number((currentBalance * 100n) / (totalScheduled || BigInt(1)));

    return NextResponse.json({
      success: true,
      data: {
        id: enrollment.id,
        accountNumber: enrollment.accountNumber,
        productName: enrollment.plan.name,
        metalType: enrollment.metalType,
        purity: enrollment.purity,
        tenureMonths: enrollment.tenureMonths,
        monthlyAmount: paiseToInrNumber(enrollment.monthlyAmountPaise),
        totalScheduledAmount: paiseToInrNumber(totalScheduled),
        schemePurchaseBalance: paiseToInrNumber(currentBalance), // User-facing terminology: Scheme Purchase Balance
        eligiblePurchaseValue: paiseToInrNumber(currentBalance), // Alternative non-wallet phrase
        remainingAmount: paiseToInrNumber(totalScheduled > currentBalance ? totalScheduled - currentBalance : BigInt(0)),
        paidInstallmentCount: paidCount,
        remainingInstallmentCount: remainingCount,
        nextDueDate: enrollment.nextDueDate,
        overdueAmount: paiseToInrNumber(enrollment.overdueAmountPaise),
        status: enrollment.status,
        progressPercent,
        startDate: enrollment.startDate,
        maturityDate: enrollment.maturityDate,
        termsVersion: enrollment.termsVersion,
        acceptedTermsAt: enrollment.acceptedTermsAt,
        nominee: enrollment.nominee
          ? {
              fullName: enrollment.nominee.fullName,
              relationship: enrollment.nominee.relationship,
              phone: enrollment.nominee.phone,
            }
          : null,
        installments: enrollment.installments.map((inst) => ({
          id: inst.id,
          installmentNo: inst.installmentNo,
          dueDate: inst.dueDate,
          amount: paiseToInrNumber(inst.amountPaise),
          status: inst.status,
          paidAt: inst.paidAt,
        })),
        recentReceipts: enrollment.receipts.map((r) => ({
          id: r.id,
          receiptNumber: r.receiptNumber,
          amount: paiseToInrNumber(r.amountPaise),
          paymentDate: r.paymentDate,
        })),
        activeRedemption: enrollment.redemptionRequests[0] || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch dashboard summary' } },
      { status: 500 }
    );
  }
}
