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
    });

    if (!enrollment || enrollment.userId !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: { message: 'Scheme account not found' } },
        { status: 404 }
      );
    }

    const ledgerEntries = await prisma.schemeLedgerEntry.findMany({
      where: { enrollmentId },
      orderBy: { createdAt: 'desc' },
    });

    const data = ledgerEntries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: paiseToInrNumber(e.amountPaise),
      balanceAfter: paiseToInrNumber(e.balanceAfterPaise),
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      actorType: e.actorType,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch ledger' } },
      { status: 500 }
    );
  }
}
