import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRazorpayWebhookSignature } from '@/lib/schemes/razorpay';
import { postLedgerEntry } from '@/lib/schemes/ledger';
import { createReceiptForPayment } from '@/lib/schemes/receipts';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

    if (webhookSecret && signature) {
      const isValid = verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 400 }
        );
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;

    if (event === 'payment.captured' || event === 'order.paid') {
      const entity = payload.payload?.payment?.entity || payload.payload?.order?.entity;
      const gatewayOrderId = entity?.order_id || entity?.id;
      const gatewayPaymentId = entity?.id;

      if (gatewayOrderId) {
        const paymentOrder = await prisma.paymentOrder.findFirst({
          where: { gatewayOrderId },
          include: { enrollment: true },
        });

        if (paymentOrder && paymentOrder.status !== 'SUCCESS') {
          await prisma.$transaction(async (tx) => {
            await tx.paymentOrder.update({
              where: { id: paymentOrder.id },
              data: {
                status: 'SUCCESS',
                gatewayPaymentId: gatewayPaymentId || paymentOrder.gatewayPaymentId,
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
                actorType: 'SYSTEM',
                actorId: 'WEBHOOK',
                metadata: {
                  event,
                  gatewayPaymentId,
                },
              },
              tx
            );

            const nextPending = await tx.installmentSchedule.findFirst({
              where: { enrollmentId: paymentOrder.enrollmentId, status: 'PENDING' },
              orderBy: { installmentNo: 'asc' },
            });

            let paidCount = paymentOrder.enrollment.paidInstallmentCount;
            let remainingCount = paymentOrder.enrollment.remainingInstallmentCount;

            if (nextPending) {
              await tx.installmentSchedule.update({
                where: { id: nextPending.id },
                data: { status: 'PAID', paidAt: new Date(), paymentOrderId: paymentOrder.id },
              });
              paidCount += 1;
              remainingCount -= 1;
            }

            const nextDue = await tx.installmentSchedule.findFirst({
              where: { enrollmentId: paymentOrder.enrollmentId, status: 'PENDING' },
              orderBy: { installmentNo: 'asc' },
            });

            const isFullyPaid = paidCount >= paymentOrder.enrollment.tenureMonths;
            const newStatus = isFullyPaid ? 'MATURED' : 'ACTIVE';

            await tx.schemeEnrollment.update({
              where: { id: paymentOrder.enrollmentId },
              data: {
                paidInstallmentCount: paidCount,
                remainingInstallmentCount: remainingCount,
                nextDueDate: nextDue?.dueDate || null,
                status: newStatus,
              },
            });

            await createReceiptForPayment(paymentOrder.id, tx);
          });
        }
      }
    } else if (event === 'payment.failed') {
      const entity = payload.payload?.payment?.entity;
      const gatewayOrderId = entity?.order_id;
      if (gatewayOrderId) {
        const paymentOrder = await prisma.paymentOrder.findFirst({
          where: { gatewayOrderId },
        });
        if (paymentOrder && paymentOrder.status === 'CREATED') {
          await prisma.paymentOrder.update({
            where: { id: paymentOrder.id },
            data: { status: 'FAILED', updatedAt: new Date() },
          });
        }
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Webhook processing error' },
      { status: 500 }
    );
  }
}
