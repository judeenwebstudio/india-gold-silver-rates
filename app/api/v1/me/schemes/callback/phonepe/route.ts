import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPhonePePaymentStatus } from '@/lib/schemes/phonepe';
import { postLedgerEntry } from '@/lib/schemes/ledger';
import { createReceiptForPayment } from '@/lib/schemes/receipts';

export async function POST(request: Request) {
  return handleCallback(request);
}

export async function GET(request: Request) {
  return handleCallback(request);
}

async function handleCallback(request: Request) {
  try {
    const url = new URL(request.url);
    const enrollmentId = url.searchParams.get('enrollmentId');
    const orderId = url.searchParams.get('orderId');

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://india-gold-silver-rates.vercel.app').replace(/\/$/, '');

    if (!orderId || !enrollmentId) {
      return NextResponse.redirect(`${siteUrl}/schemes/dashboard`);
    }

    const paymentOrder = await prisma.paymentOrder.findFirst({
      where: {
        OR: [{ orderId }, { gatewayOrderId: orderId }],
      },
      include: { enrollment: true },
    });

    if (!paymentOrder) {
      return NextResponse.redirect(`${siteUrl}/schemes/dashboard/${enrollmentId}?error=OrderNotFound`);
    }

    if (paymentOrder.status === 'SUCCESS') {
      const receipt = await prisma.receipt.findFirst({ where: { paymentOrderId: paymentOrder.id } });
      return NextResponse.redirect(`${siteUrl}/schemes/dashboard/${enrollmentId}?payment=success&receipt=${receipt?.receiptNumber || ''}`);
    }

    // Verify with PhonePe API
    const phonePeStatus = await checkPhonePePaymentStatus(paymentOrder.gatewayOrderId || orderId);

    if (!phonePeStatus.success) {
      await prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: { status: 'FAILED' },
      });
      return NextResponse.redirect(`${siteUrl}/schemes/dashboard/${enrollmentId}?error=PaymentFailed`);
    }

    // Execute financial credit inside database transaction
    const receipt = await prisma.$transaction(async (tx) => {
      await tx.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: {
          status: 'SUCCESS',
          gatewayPaymentId: phonePeStatus.data?.transactionId || `PP_TX_${orderId}`,
          gatewaySignature: 'PHONEPE_CALLBACK_VERIFIED',
          updatedAt: new Date(),
        },
      });

      await postLedgerEntry(
        {
          enrollmentId: paymentOrder.enrollmentId,
          type: 'INSTALLMENT_CREDIT',
          amountPaise: paymentOrder.amountPaise,
          referenceType: 'PAYMENT_ORDER',
          referenceId: paymentOrder.id,
          paymentOrderId: paymentOrder.id,
          actorType: 'USER',
          actorId: paymentOrder.userId,
          metadata: {
            gateway: 'PHONEPE',
            transactionId: phonePeStatus.data?.transactionId,
          },
        },
        tx
      );

      const nextPending = await tx.installmentSchedule.findFirst({
        where: { enrollmentId: paymentOrder.enrollmentId, status: 'PENDING' },
        orderBy: { installmentNo: 'asc' },
      });

      let updatedPaidCount = paymentOrder.enrollment.paidInstallmentCount;
      let updatedRemainingCount = paymentOrder.enrollment.remainingInstallmentCount;

      if (nextPending) {
        await tx.installmentSchedule.update({
          where: { id: nextPending.id },
          data: { status: 'PAID', paidAt: new Date(), paymentOrderId: paymentOrder.id },
        });
        updatedPaidCount += 1;
        updatedRemainingCount -= 1;
      }

      const isFullyPaid = updatedPaidCount >= paymentOrder.enrollment.tenureMonths;
      await tx.schemeEnrollment.update({
        where: { id: paymentOrder.enrollmentId },
        data: {
          paidInstallmentCount: updatedPaidCount,
          remainingInstallmentCount: updatedRemainingCount,
          status: isFullyPaid ? 'MATURED' : 'ACTIVE',
        },
      });

      return await createReceiptForPayment(paymentOrder.id, tx);
    });

    return NextResponse.redirect(`${siteUrl}/schemes/dashboard/${enrollmentId}?payment=success&receipt=${receipt.receiptNumber}`);
  } catch (err) {
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://india-gold-silver-rates.vercel.app').replace(/\/$/, '');
    return NextResponse.redirect(`${siteUrl}/schemes/dashboard?error=PaymentProcessingError`);
  }
}
