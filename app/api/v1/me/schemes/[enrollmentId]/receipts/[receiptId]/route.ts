import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { paiseToInrNumber } from '@/lib/schemes/precision';

export async function GET(
  request: Request,
  context: { params: Promise<{ enrollmentId: string; receiptId: string }> }
) {
  try {
    const { enrollmentId, receiptId } = await context.params;

    const authUser = await authenticateSchemeUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        enrollment: { include: { plan: true, user: true } },
        paymentOrder: true,
      },
    });

    if (!receipt || receipt.enrollmentId !== enrollmentId || receipt.userId !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: { message: 'Receipt not found' } },
        { status: 404 }
      );
    }

    const merchantConfig = await prisma.merchantConfig.findUnique({
      where: { id: 'default' },
    });

    return NextResponse.json({
      success: true,
      data: {
        receiptNumber: receipt.receiptNumber,
        paymentDate: receipt.paymentDate,
        amount: paiseToInrNumber(receipt.amountPaise),
        accountNumber: receipt.enrollment.accountNumber,
        productName: receipt.enrollment.plan.name,
        userName: receipt.enrollment.user.fullName,
        userPhone: receipt.enrollment.user.phone,
        userEmail: receipt.enrollment.user.email,
        paymentGateway: receipt.paymentOrder.gateway,
        gatewayPaymentId: receipt.paymentOrder.gatewayPaymentId,
        merchantDetails: {
          sellerName: merchantConfig?.legalSellerName || 'RateStack Jewellery & Coins India Pvt Ltd',
          gstin: merchantConfig?.gstin || '27AAAAA0000A1Z5',
          invoiceIssuer: merchantConfig?.invoiceIssuer || 'RateStack Operations Hub',
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to fetch receipt' } },
      { status: 500 }
    );
  }
}
