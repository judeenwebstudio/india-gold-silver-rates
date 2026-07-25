import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { paiseToInrNumber } from '@/lib/schemes/precision';
import { getLatestNationalBaseRates } from '@/lib/city-rate-service';

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
        paymentOrders: { orderBy: { createdAt: 'desc' }, take: 15 },
        receipts: { orderBy: { createdAt: 'desc' }, take: 15 },
        redemptionRequests: { include: { quotation: true }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!enrollment || enrollment.userId !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: { message: 'Scheme account not found or access denied' } },
        { status: 404 }
      );
    }

    // Ledger verified balance check
    const ledgerSum = await prisma.schemeLedgerEntry.aggregate({
      where: { enrollmentId },
      _sum: { amountPaise: true },
    });
    const verifiedLedgerBalancePaise = ledgerSum._sum.amountPaise || 0n;

    const totalScheduled = enrollment.totalScheduledAmountPaise;
    const currentBalance = enrollment.eligiblePurchaseBalancePaise;
    const paidCount = enrollment.paidInstallmentCount;
    const remainingCount = enrollment.remainingInstallmentCount;
    const totalInstallments = enrollment.tenureMonths;
    const progressPercent = Math.min(100, Math.round(Number((currentBalance * 100n) / (totalScheduled || 1n))));

    // Calculate remaining scheduled amount (never negative!)
    const remainingPaise = totalScheduled > currentBalance ? totalScheduled - currentBalance : 0n;

    // Next installment status determination
    const now = new Date();
    let nextInstallmentData = null;
    const nextInst = enrollment.installments.find((i) => i.status !== 'PAID');
    if (nextInst) {
      const due = new Date(nextInst.dueDate);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let statusTag: 'UPCOMING' | 'DUE_TODAY' | 'GRACE_PERIOD' | 'OVERDUE' = 'UPCOMING';
      if (diffDays === 0) {
        statusTag = 'DUE_TODAY';
      } else if (diffDays < 0 && Math.abs(diffDays) <= (enrollment.plan.gracePeriodDays || 7)) {
        statusTag = 'GRACE_PERIOD';
      } else if (diffDays < 0) {
        statusTag = 'OVERDUE';
      }

      nextInstallmentData = {
        id: nextInst.id,
        installmentNo: nextInst.installmentNo,
        dueDate: nextInst.dueDate,
        amount: paiseToInrNumber(nextInst.amountPaise),
        status: nextInst.status,
        statusTag,
      };
    }

    // Fetch benchmark live metal rates
    let relevantCurrentMetalRate = null;
    try {
      const snapshot = await getLatestNationalBaseRates();
      if (enrollment.metalType === 'GOLD') {
        const gold22k = snapshot.rates.find((r) => r.id === 'gold-22k');
        if (gold22k) {
          relevantCurrentMetalRate = {
            metalType: 'GOLD',
            purity: 'K22',
            pricePerGramInr: gold22k.price,
            pricePerGramPaise: Math.round(gold22k.price * 100),
            source: snapshot.source || 'IBJA Benchmark',
            recordedAt: snapshot.sourceTimestamp || snapshot.lastUpdatedAt || new Date().toISOString(),
          };
        }
      } else {
        const silverGram = snapshot.rates.find((r) => r.id === 'silver-gram');
        const silverKg = snapshot.rates.find((r) => r.id === 'silver-kg');
        if (silverGram) {
          relevantCurrentMetalRate = {
            metalType: 'SILVER',
            purity: 'P999',
            pricePerGramInr: silverGram.price,
            pricePerKgInr: silverKg?.price || silverGram.price * 1000,
            pricePerGramPaise: Math.round(silverGram.price * 100),
            source: snapshot.source || 'IBJA Benchmark',
            recordedAt: snapshot.sourceTimestamp || snapshot.lastUpdatedAt || new Date().toISOString(),
          };
        }
      }
    } catch {
      // Fallback baseline rate if live rates unavailable
      relevantCurrentMetalRate = {
        metalType: enrollment.metalType,
        purity: enrollment.purity,
        pricePerGramInr: enrollment.metalType === 'GOLD' ? 7500 : 92,
        pricePerKgInr: enrollment.metalType === 'GOLD' ? 7500000 : 92000,
        source: 'Standard Rate',
        recordedAt: new Date().toISOString(),
      };
    }

    // Redemption eligibility checks
    const isEligible = enrollment.status === 'MATURED' || paidCount >= totalInstallments || now >= new Date(enrollment.maturityDate);
    const redemptionEligibility = {
      isEligible,
      maturityDate: enrollment.maturityDate,
      remainingInstallments: remainingCount,
      reasonIfNotEligible: isEligible
        ? 'Eligible for coin redemption'
        : `Redemption available after maturity on ${new Date(enrollment.maturityDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (${remainingCount} installments remaining)`,
    };

    return NextResponse.json({
      success: true,
      data: {
        enrollment: {
          id: enrollment.id,
          accountNumber: enrollment.accountNumber,
          productName: enrollment.plan.name,
          metalType: enrollment.metalType,
          purity: enrollment.purity,
          tenureMonths: enrollment.tenureMonths,
          monthlyAmount: paiseToInrNumber(enrollment.monthlyAmountPaise),
          totalScheduledAmount: paiseToInrNumber(totalScheduled),
          startDate: enrollment.startDate,
          maturityDate: enrollment.maturityDate,
          nextDueDate: enrollment.nextDueDate,
          status: enrollment.status,
          termsVersion: enrollment.termsVersion,
          acceptedTermsAt: enrollment.acceptedTermsAt,
        },
        schemePlan: {
          id: enrollment.plan.id,
          name: enrollment.plan.name,
          gracePeriodDays: enrollment.plan.gracePeriodDays,
          coinDenominations: enrollment.plan.coinDenominations.map((d) => ({
            id: d.id,
            title: d.title,
            weightMilligrams: Number(d.weightMilligrams),
            weightGrams: Number(d.weightMilligrams) / 1000,
            mintingFee: paiseToInrNumber(d.mintingFeePaise),
            packagingFee: paiseToInrNumber(d.packagingFeePaise),
            inStock: d.inStock,
          })),
        },
        schemePurchaseBalance: paiseToInrNumber(currentBalance),
        eligiblePurchaseValue: paiseToInrNumber(currentBalance),
        verifiedContributionTotal: paiseToInrNumber(verifiedLedgerBalancePaise),
        scheduledTotal: paiseToInrNumber(totalScheduled),
        remainingScheduledAmount: paiseToInrNumber(remainingPaise),
        paidInstallmentCount: paidCount,
        remainingInstallmentCount: remainingCount,
        totalInstallments,
        progressPercent,
        nextInstallment: nextInstallmentData,
        overdueInformation: {
          isOverdue: enrollment.overdueAmountPaise > 0n,
          overdueAmount: paiseToInrNumber(enrollment.overdueAmountPaise),
        },
        installments: enrollment.installments.map((inst) => ({
          id: inst.id,
          installmentNo: inst.installmentNo,
          dueDate: inst.dueDate,
          amount: paiseToInrNumber(inst.amountPaise),
          status: inst.status,
          paidAt: inst.paidAt,
        })),
        recentPayments: enrollment.paymentOrders.map((p) => ({
          id: p.id,
          orderId: p.orderId,
          amount: paiseToInrNumber(p.amountPaise),
          gateway: p.gateway,
          status: p.status,
          gatewayPaymentId: p.gatewayPaymentId,
          createdAt: p.createdAt,
          retryable: (p.status === 'FAILED' || p.status === 'EXPIRED') && enrollment.status === 'ACTIVE',
        })),
        recentReceipts: enrollment.receipts.map((r) => ({
          id: r.id,
          receiptNumber: r.receiptNumber,
          amount: paiseToInrNumber(r.amountPaise),
          paymentDate: r.paymentDate,
          paymentOrderId: r.paymentOrderId,
        })),
        redemptionEligibility,
        redemptionStatus: enrollment.redemptionRequests[0] || null,
        relevantCurrentMetalRate,
        nominee: enrollment.nominee
          ? {
              fullName: enrollment.nominee.fullName,
              relationship: enrollment.nominee.relationship,
              phone: enrollment.nominee.phone,
            }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch dashboard summary' } },
      { status: 500 }
    );
  }
}
