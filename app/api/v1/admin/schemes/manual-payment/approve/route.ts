import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { postLedgerEntry } from '@/lib/schemes/ledger';
import { createReceiptForPayment } from '@/lib/schemes/receipts';
import { z } from 'zod';

const approveSchema = z.object({
  queueId: z.string().min(1),
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const checkerId = session.user.id;
    const body = await request.json();
    const parsed = approveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { message: parsed.error.issues[0].message } }, { status: 400 });
    }

    const { queueId, action, rejectionReason } = parsed.data;

    const item = await prisma.manualPaymentQueue.findUnique({
      where: { id: queueId },
      include: { enrollment: true },
    });

    if (!item || item.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ success: false, error: { message: 'Pending manual payment request not found' } }, { status: 404 });
    }

    // STRICT MAKER-CHECKER SECURITY RULE: Maker cannot approve their own entry
    if (item.makerAdminId === checkerId) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'SECURITY VIOLATION: Maker cannot approve their own manual payment entry. Checker review by another admin is required.' },
        },
        { status: 403 }
      );
    }

    if (action === 'REJECT') {
      await prisma.manualPaymentQueue.update({
        where: { id: queueId },
        data: {
          status: 'REJECTED',
          checkerAdminId: checkerId,
          rejectionReason: rejectionReason || 'Rejected by checker admin',
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        data: { message: 'Manual payment rejected' },
      });
    }

    // Execute approval and ledger credit
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update queue entry
      await tx.manualPaymentQueue.update({
        where: { id: queueId },
        data: {
          status: 'APPROVED',
          checkerAdminId: checkerId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 2. Create PaymentOrder record
      const orderId = `ORD-MANUAL-${Date.now()}`;
      const paymentOrder = await tx.paymentOrder.create({
        data: {
          orderId,
          enrollmentId: item.enrollmentId,
          userId: item.enrollment.userId,
          amountPaise: item.amountPaise,
          currency: 'INR',
          gateway: 'MANUAL',
          status: 'SUCCESS',
          idempotencyKey: `ik_manual_${item.id}`,
          gatewayOrderId: item.referenceNumber || `manual_ref_${item.id}`,
          gatewayPaymentId: `manual_pay_${item.id}`,
        },
      });

      // 3. Post to double-entry append-only ledger
      const ledger = await postLedgerEntry(
        {
          enrollmentId: item.enrollmentId,
          type: 'MANUAL_ENTRY_CREDIT',
          amountPaise: item.amountPaise,
          referenceType: 'MANUAL_ENTRY',
          referenceId: item.id,
          paymentOrderId: paymentOrder.id,
          actorType: 'ADMIN',
          actorId: checkerId,
          metadata: {
            makerAdminId: item.makerAdminId,
            checkerAdminId: checkerId,
            paymentMode: item.paymentMode,
          },
        },
        tx
      );

      // 4. Update installment schedule
      const nextPending = await tx.installmentSchedule.findFirst({
        where: { enrollmentId: item.enrollmentId, status: 'PENDING' },
        orderBy: { installmentNo: 'asc' },
      });

      let updatedPaidCount = item.enrollment.paidInstallmentCount;
      let updatedRemainingCount = item.enrollment.remainingInstallmentCount;

      if (nextPending) {
        await tx.installmentSchedule.update({
          where: { id: nextPending.id },
          data: { status: 'PAID', paidAt: new Date(), paymentOrderId: paymentOrder.id },
        });
        updatedPaidCount += 1;
        updatedRemainingCount -= 1;
      }

      const nextDue = await tx.installmentSchedule.findFirst({
        where: { enrollmentId: item.enrollmentId, status: 'PENDING' },
        orderBy: { installmentNo: 'asc' },
      });

      const isFullyPaid = updatedPaidCount >= item.enrollment.tenureMonths;

      await tx.schemeEnrollment.update({
        where: { id: item.enrollmentId },
        data: {
          paidInstallmentCount: updatedPaidCount,
          remainingInstallmentCount: updatedRemainingCount,
          nextDueDate: nextDue?.dueDate || null,
          status: isFullyPaid ? 'MATURED' : 'ACTIVE',
        },
      });

      // 5. Generate receipt
      const receipt = await createReceiptForPayment(paymentOrder.id, tx);

      return {
        receiptNumber: receipt.receiptNumber,
        newBalance: ledger.newBalancePaise,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Manual payment approved successfully by checker and credited to Scheme Purchase Balance.',
        receiptNumber: result.receiptNumber,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
