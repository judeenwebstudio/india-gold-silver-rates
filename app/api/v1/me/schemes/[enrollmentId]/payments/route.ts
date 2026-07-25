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

    const payments = await prisma.paymentOrder.findMany({
      where: {
        enrollmentId,
        userId: authUser.userId,
      },
      include: {
        receipts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      amount: paiseToInrNumber(p.amountPaise),
      gateway: p.gateway,
      status: p.status,
      gatewayPaymentId: p.gatewayPaymentId,
      receiptNumber: p.receipts[0]?.receiptNumber || null,
      receiptId: p.receipts[0]?.id || null,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch payments' } },
      { status: 500 }
    );
  }
}
