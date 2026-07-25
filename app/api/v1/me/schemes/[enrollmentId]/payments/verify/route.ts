import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { verifyRazorpaySignature } from '@/lib/schemes/razorpay';
import { verifyMockPaymentSignature } from '@/lib/schemes/mock-gateway';
import { postLedgerEntry } from '@/lib/schemes/ledger';
import { createReceiptForPayment } from '@/lib/schemes/receipts';
import { paiseToInrNumber } from '@/lib/schemes/precision';
import { z } from 'zod';

const verifySchema = z.object({
  paymentOrderId: z.string().min(1, 'Payment Order ID is required'),
  gatewayPaymentId: z.string().min(1, 'Gateway Payment ID is required'),
  gatewaySignature: z.string().min(1, 'Gateway Signature is required'),
});

export async function POST(
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

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { paymentOrderId, gatewayPaymentId, gatewaySignature } = parsed.data;

    // 1. Fetch Payment Order
    const paymentOrder = await prisma.paymentOrder.findUnique({
      where: { id: paymentOrderId },
      include: { enrollment: true },
    });

    if (!paymentOrder || paymentOrder.enrollmentId !== enrollmentId) {
      return NextResponse.json(
        { success: false, error: { message: 'Payment order record not found' } },
        { status: 404 }
      );
    }

    if (paymentOrder.status === 'SUCCESS') {
      const receipt = await prisma.receipt.findFirst({
        where: { paymentOrderId: paymentOrder.id },
      });
      return NextResponse.json({
        success: true,
        data: {
          message: 'Payment already verified',
          receiptNumber: receipt?.receiptNumber,
          schemePurchaseBalance: paiseToInrNumber(paymentOrder.enrollment.eligiblePurchaseBalancePaise),
        },
      });
    }

    // 2. Verify signature based on gateway
    let isValid = false;
    if (paymentOrder.gateway === 'MOCK') {
      isValid = verifyMockPaymentSignature(
        paymentOrder.gatewayOrderId || '',
        gatewayPaymentId,
        gatewaySignature
      );
    } else {
      isValid = verifyRazorpaySignature(
        paymentOrder.gatewayOrderId || '',
        gatewayPaymentId,
        gatewaySignature
      );
    }

    if (!isValid) {
      await prisma.paymentOrder.update({
        where: { id: paymentOrderId },
        data: { status: 'FAILED' },
      });
      return NextResponse.json(
        { success: false, error: { message: 'Payment signature verification failed' } },
        { status: 400 }
      );
    }

    // 3. Execute financial verification inside database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Mark PaymentOrder SUCCESS
      await tx.paymentOrder.update({
        where: { id: paymentOrderId },
        data: {
          status: 'SUCCESS',
          gatewayPaymentId,
          gatewaySignature,
          updatedAt: new Date(),
        },
      });

      // Post double-entry append-only ledger entry (updates eligiblePurchaseBalancePaise)
      const ledger = await postLedgerEntry(
        {
          enrollmentId,
          type: 'INSTALLMENT_CREDIT',
          amountPaise: paymentOrder.amountPaise,
          referenceType: 'PAYMENT_ORDER',
          referenceId: paymentOrder.id,
          paymentOrderId: paymentOrder.id,
          actorType: 'USER',
          actorId: authUser.userId,
          metadata: {
            gateway: paymentOrder.gateway,
            gatewayPaymentId,
          },
        },
        tx
      );

      // Find next pending installment and mark paid
      const nextPendingInstallment = await tx.installmentSchedule.findFirst({
        where: {
          enrollmentId,
          status: 'PENDING',
        },
        orderBy: { installmentNo: 'asc' },
      });

      let updatedPaidCount = paymentOrder.enrollment.paidInstallmentCount;
      let updatedRemainingCount = paymentOrder.enrollment.remainingInstallmentCount;

      if (nextPendingInstallment) {
        await tx.installmentSchedule.update({
          where: { id: nextPendingInstallment.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            paymentOrderId: paymentOrder.id,
          },
        });
        updatedPaidCount += 1;
        updatedRemainingCount -= 1;
      }

      // Calculate next due date
      const nextDueInstallment = await tx.installmentSchedule.findFirst({
        where: {
          enrollmentId,
          status: 'PENDING',
        },
        orderBy: { installmentNo: 'asc' },
      });

      const isFullyPaid = updatedPaidCount >= paymentOrder.enrollment.tenureMonths;
      const newStatus = isFullyPaid ? 'MATURED' : 'ACTIVE';

      await tx.schemeEnrollment.update({
        where: { id: enrollmentId },
        data: {
          paidInstallmentCount: updatedPaidCount,
          remainingInstallmentCount: updatedRemainingCount,
          nextDueDate: nextDueInstallment?.dueDate || null,
          status: newStatus,
        },
      });

      // Generate sequential receipt
      const receipt = await createReceiptForPayment(paymentOrder.id, tx);

      return {
        receiptNumber: receipt.receiptNumber,
        newBalancePaise: ledger.newBalancePaise,
        isFullyPaid,
        status: newStatus,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Payment verified and credited to Scheme Purchase Balance successfully',
        receiptNumber: result.receiptNumber,
        schemePurchaseBalance: paiseToInrNumber(result.newBalancePaise),
        status: result.status,
        isFullyPaid: result.isFullyPaid,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Payment verification failed' } },
      { status: 500 }
    );
  }
}
