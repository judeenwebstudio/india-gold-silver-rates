import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { paiseToInrNumber } from '@/lib/schemes/precision';

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exportCsv = searchParams.get('format') === 'csv';

    // Summary metrics
    const totalMembers = await prisma.schemeUser.count();
    const activeSchemes = await prisma.schemeEnrollment.count({ where: { status: 'ACTIVE' } });
    const maturedSchemes = await prisma.schemeEnrollment.count({ where: { status: 'MATURED' } });
    const redeemedSchemes = await prisma.schemeEnrollment.count({ where: { status: 'REDEEMED' } });
    const cancelledSchemes = await prisma.schemeEnrollment.count({ where: { status: 'CANCELLED' } });

    // Financial sums
    const totalPayments = await prisma.paymentOrder.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amountPaise: true },
    });

    const goldPayments = await prisma.paymentOrder.aggregate({
      where: { status: 'SUCCESS', enrollment: { metalType: 'GOLD' } },
      _sum: { amountPaise: true },
    });

    const silverPayments = await prisma.paymentOrder.aggregate({
      where: { status: 'SUCCESS', enrollment: { metalType: 'SILVER' } },
      _sum: { amountPaise: true },
    });

    const totalBalance = await prisma.schemeEnrollment.aggregate({
      _sum: { eligiblePurchaseBalancePaise: true },
    });

    const totalScheduled = await prisma.schemeEnrollment.aggregate({
      _sum: { totalScheduledAmountPaise: true },
    });

    const summary = {
      totalMembers,
      activeSchemes,
      maturedSchemes,
      redeemedSchemes,
      cancelledSchemes,
      totalVerifiedCollectionsInr: paiseToInrNumber(totalPayments._sum.amountPaise || BigInt(0)),
      goldCollectionsInr: paiseToInrNumber(goldPayments._sum.amountPaise || BigInt(0)),
      silverCollectionsInr: paiseToInrNumber(silverPayments._sum.amountPaise || BigInt(0)),
      totalPurchaseLiabilityInr: paiseToInrNumber(totalBalance._sum.eligiblePurchaseBalancePaise || BigInt(0)),
      totalScheduledLiabilitiesInr: paiseToInrNumber(totalScheduled._sum.totalScheduledAmountPaise || BigInt(0)),
    };

    if (exportCsv) {
      const csv = `Metric,Value\nTotal Members,${summary.totalMembers}\nActive Schemes,${summary.activeSchemes}\nMatured Schemes,${summary.maturedSchemes}\nRedeemed Schemes,${summary.redeemedSchemes}\nTotal Collections (₹),${summary.totalVerifiedCollectionsInr}\nGold Collections (₹),${summary.goldCollectionsInr}\nSilver Collections (₹),${summary.silverCollectionsInr}\nTotal Scheme Purchase Balance Liability (₹),${summary.totalPurchaseLiabilityInr}\n`;
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="ratestack_schemes_report.csv"',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
