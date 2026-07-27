import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPhonePeConfig, verifyPhonePeCallbackChecksum } from '@/lib/schemes/phonepe';
import { postLedgerEntry } from '@/lib/schemes/ledger';
import { createReceiptForPayment } from '@/lib/schemes/receipts';

export async function POST(request: Request) {
  try {
    const xVerify = request.headers.get('x-verify') || '';
    const bodyText = await request.text();
    let bodyObj: any = {};
    try {
      bodyObj = JSON.parse(bodyText);
    } catch (e) {
      bodyObj = {};
    }

    const responseBase64 = bodyObj.response || '';
    const config = getPhonePeConfig();

    if (xVerify && responseBase64) {
      const isChecksumValid = verifyPhonePeCallbackChecksum(responseBase64, xVerify, config.saltKey);
      if (!isChecksumValid) {
        return NextResponse.json({ success: false, message: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    let decodedJson: any = {};
    if (responseBase64) {
      const decodedString = Buffer.from(responseBase64, 'base64').toString('utf-8');
      decodedJson = JSON.parse(decodedString);
    }

    const merchantTransactionId = decodedJson.data?.merchantTransactionId || bodyObj.merchantTransactionId;
    const code = decodedJson.code || bodyObj.code;

    if (!merchantTransactionId) {
      return NextResponse.json({ success: false, message: 'Missing merchantTransactionId' }, { status: 400 });
    }

    const paymentOrder = await prisma.paymentOrder.findFirst({
      where: {
        OR: [{ orderId: merchantTransactionId }, { gatewayOrderId: merchantTransactionId }],
      },
      include: { enrollment: true },
    });

    if (!paymentOrder) {
      return NextResponse.json({ success: false, message: 'Payment order record not found' }, { status: 404 });
    }

    if (paymentOrder.status === 'SUCCESS') {
      return NextResponse.json({ success: true, message: 'Payment order already processed' });
    }

    if (code === 'PAYMENT_SUCCESS') {
      const transactionId = decodedJson.data?.transactionId || `PP_WEBHOOK_${merchantTransactionId}`;

      await prisma.$transaction(async (tx) => {
        await tx.paymentOrder.update({
          where: { id: paymentOrder.id },
          data: {
            status: 'SUCCESS',
            gatewayPaymentId: transactionId,
            gatewaySignature: 'PHONEPE_WEBHOOK_VERIFIED',
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
              transactionId,
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

        await createReceiptForPayment(paymentOrder.id, tx);
      });

      return NextResponse.json({ success: true, message: 'Payment recorded successfully' });
    } else {
      await prisma.paymentOrder.update({
        where: { id: paymentOrder.id },
        data: { status: 'FAILED' },
      });
      return NextResponse.json({ success: true, message: 'Payment failure recorded' });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
