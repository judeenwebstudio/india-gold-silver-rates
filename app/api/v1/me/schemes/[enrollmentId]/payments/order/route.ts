import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { enforceMerchantGuardForLivePayments } from '@/lib/schemes/merchant-guard';
import { createRazorpayOrder } from '@/lib/schemes/razorpay';
import { createMockPaymentOrder } from '@/lib/schemes/mock-gateway';
import { paiseToInrNumber } from '@/lib/schemes/precision';
import crypto from 'crypto';
import { z } from 'zod';

const paymentOrderSchema = z.object({
  idempotencyKey: z.string().optional(),
  gateway: z.enum(['RAZORPAY', 'MOCK']).default('RAZORPAY'),
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

    // 2. Merchant compliance check
    await enforceMerchantGuardForLivePayments();

    const body = await request.json().catch(() => ({}));
    const parsed = paymentOrderSchema.safeParse(body);
    const gateway = parsed.success ? parsed.data.gateway : 'RAZORPAY';

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

    // Create order on gateway adapter
    let gatewayOrderId = '';
    let usedGateway = gateway;

    if (gateway === 'MOCK' || ((process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_SCHEME_TESTING === 'true' || process.env.ALLOW_SANDBOX_SCHEMES === 'true') && !process.env.RAZORPAY_KEY_ID)) {
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_SCHEME_TESTING !== 'true' && process.env.ALLOW_SANDBOX_SCHEMES !== 'true') {
        return NextResponse.json(
          { success: false, error: { message: 'Razorpay API credentials are missing' } },
          { status: 503 }
        );
      }
      const mockOrder = createMockPaymentOrder({
        orderId,
        amountPaise,
        idempotencyKey,
      });
      gatewayOrderId = mockOrder.gatewayOrderId;
      usedGateway = 'MOCK';
    } else {
      try {
        const razorpayOrder = await createRazorpayOrder({
          orderId,
          amountPaise,
          receiptNumber: orderId,
        });
        gatewayOrderId = razorpayOrder.gatewayOrderId;
        usedGateway = 'RAZORPAY';
      } catch (err: any) {
        if (err.message?.includes('credentials')) {
          return NextResponse.json(
            { success: false, error: { message: 'Razorpay API credentials are missing' } },
            { status: 503 }
          );
        }
        throw err;
      }
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
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key',
      },
    });
  } catch (error: any) {
    const isCredentialsErr = error?.message?.includes('credentials');
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create payment order' } },
      { status: isCredentialsErr ? 503 : 500 }
    );
  }
}
