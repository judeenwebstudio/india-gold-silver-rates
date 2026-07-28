import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { enforceMerchantGuardForLivePayments } from '@/lib/schemes/merchant-guard';
import { getActivePaymentGateway } from '@/lib/schemes/gateway';
import { createPhonePeOrder } from '@/lib/schemes/phonepe';
import { createRazorpayOrder } from '@/lib/schemes/razorpay';
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

    const activeGateway = await getActivePaymentGateway();

    // 2. Merchant compliance check
    await enforceMerchantGuardForLivePayments();

    const body = await request.json().catch(() => ({}));
    const parsed = paymentOrderSchema.safeParse(body);

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
      if (activeGateway === 'RAZORPAY') {
        const razorpayOrder = await createRazorpayOrder({
          orderId,
          amountPaise,
          receiptNumber: orderId,
        });
        gatewayOrderId = razorpayOrder.gatewayOrderId;
      } else {
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
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '';
      if (errorMessage.includes('credentials')) {
        return NextResponse.json(
          { success: false, error: { message: 'Payment service is not configured yet.' } },
          { status: 503 }
        );
      }
      if (activeGateway === 'PHONEPE' && errorMessage.includes('BLOCKED_MERCHANT')) {
        return NextResponse.json(
          { success: false, error: { code: 'BLOCKED_MERCHANT', message: 'PhonePe is temporarily unavailable. Please try again shortly.' } },
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
        keyId: activeGateway === 'RAZORPAY' ? process.env.RAZORPAY_KEY_ID : undefined,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to create payment order';
    const isCredentialsErr = errorMessage.includes('credentials');
    return NextResponse.json(
      { success: false, error: { message: isCredentialsErr ? 'Payment service is not configured yet.' : errorMessage } },
      { status: isCredentialsErr ? 503 : 500 }
    );
  }
}
