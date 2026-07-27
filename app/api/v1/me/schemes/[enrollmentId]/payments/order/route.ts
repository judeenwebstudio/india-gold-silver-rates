import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { enforceMerchantGuardForLivePayments } from '@/lib/schemes/merchant-guard';
import { getActivePaymentGateway } from '@/lib/schemes/gateway';
import { createPhonePeOrder } from '@/lib/schemes/phonepe';
import { paiseToInrNumber } from '@/lib/schemes/precision';
import { z } from 'zod';

const paymentOrderSchema = z.object({
  idempotencyKey: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const { enrollmentId } = await context.params;

    // 1. Auth check
    const authUser = await authenticateSchemeUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const activeGateway = getActivePaymentGateway();
    console.log({
      activeGateway,
      paymentGatewayEnv: process.env.PAYMENT_GATEWAY,
      phonePeEnv: process.env.PHONEPE_ENV,
    });

    // 2. Merchant compliance check
    await enforceMerchantGuardForLivePayments();

    const body = await request.json().catch(() => ({}));
    const parsed = paymentOrderSchema.safeParse(body);

    if (activeGateway !== 'PHONEPE') {
      return NextResponse.json(
        { success: false, error: { message: 'PhonePe is the only supported payment gateway.' } },
        { status: 503 }
      );
    }

    // 3. Fetch Enrollment & Next Installment
    const enrollment = await prisma.schemeEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment || enrollment.userId !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: { message: 'Scheme account not found' } },
        { status: 404 }
      );
    }

    if (enrollment.status !== 'ACTIVE' && enrollment.status !== 'PAUSED') {
      return NextResponse.json(
        { success: false, error: { message: `Cannot make payments for scheme with status ${enrollment.status}` } },
        { status: 400 }
      );
    }

    const idempotencyKey = parsed.data?.idempotencyKey || `ik_${enrollment.id}_inst_${enrollment.paidInstallmentCount + 1}_${Date.now()}`;

    // Check existing pending order with idempotency key
    const existingOrder = await prisma.paymentOrder.findUnique({
      where: { idempotencyKey },
    });

    if (existingOrder && existingOrder.status === 'CREATED') {
      return NextResponse.json({
        success: true,
        data: {
          paymentOrderId: existingOrder.id,
          orderId: existingOrder.orderId,
          gatewayOrderId: existingOrder.gatewayOrderId,
          amount: paiseToInrNumber(existingOrder.amountPaise),
          currency: existingOrder.currency,
          gateway: existingOrder.gateway,
        },
      });
    }

    const orderId = `ORD-SCH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const amountPaise = enrollment.monthlyAmountPaise;

    let gatewayOrderId = '';
    const usedGateway = activeGateway;
    let redirectUrl = '';
    let merchantId = '';

    try {
      const phonePeOrder = await createPhonePeOrder({
        orderId,
        amountPaise,
        receiptNumber: orderId,
        userId: authUser.userId,
        mobileNumber: authUser.phone,
        enrollmentId: enrollment.id,
      });
      gatewayOrderId = phonePeOrder.merchantTransactionId;
      redirectUrl = phonePeOrder.redirectUrl;
      merchantId = phonePeOrder.merchantId;
    } catch (err: any) {
      if (err.message?.includes('credentials')) {
        return NextResponse.json(
          { success: false, error: { message: 'Payment service is not configured yet.' } },
          { status: 503 }
        );
      }
      throw err;
    }

    // Save PaymentOrder in DB
    const paymentOrder = await prisma.paymentOrder.create({
      data: {
        orderId,
        enrollmentId: enrollment.id,
        userId: authUser.userId,
        amountPaise,
        currency: 'INR',
        gateway: usedGateway,
        status: 'CREATED',
        idempotencyKey,
        gatewayOrderId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentOrderId: paymentOrder.id,
        orderId: paymentOrder.orderId,
        gatewayOrderId: paymentOrder.gatewayOrderId,
        amount: paiseToInrNumber(paymentOrder.amountPaise),
        currency: paymentOrder.currency,
        gateway: paymentOrder.gateway,
        redirectUrl: redirectUrl || undefined,
        merchantTransactionId: paymentOrder.gatewayOrderId || paymentOrder.orderId,
        merchantId: merchantId || undefined,
      },
    });
  } catch (error: any) {
    const isCredentialsErr = error?.message?.includes('credentials');
    return NextResponse.json(
      { success: false, error: { message: isCredentialsErr ? 'Payment service is not configured yet.' : (error.message || 'Failed to create payment order') } },
      { status: isCredentialsErr ? 503 : 500 }
    );
  }
}
