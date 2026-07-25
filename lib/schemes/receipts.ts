/**
 * RateStack Savings Scheme Module - Receipt Engine
 * Generates sequential receipt numbers (RCP-YYYY-XXXXX) and payment receipts.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

export async function generateSequentialReceiptNumber(txClient?: Prisma.TransactionClient): Promise<string> {
  const db = txClient || prisma;
  const currentYear = new Date().getFullYear();
  const prefix = `RCP-${currentYear}-`;

  const lastReceipt = await db.receipt.findFirst({
    where: {
      receiptNumber: { startsWith: prefix },
    },
    orderBy: { createdAt: 'desc' },
    select: { receiptNumber: true },
  });

  let nextSeq = 1;
  if (lastReceipt?.receiptNumber) {
    const parts = lastReceipt.receiptNumber.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
  }

  const padded = nextSeq.toString().padStart(5, '0');
  return `${prefix}${padded}`;
}

export async function createReceiptForPayment(
  paymentOrderId: string,
  txClient?: Prisma.TransactionClient
) {
  const db = txClient || prisma;

  const paymentOrder = await db.paymentOrder.findUnique({
    where: { id: paymentOrderId },
    include: { enrollment: true },
  });

  if (!paymentOrder || paymentOrder.status !== 'SUCCESS') {
    throw new Error(`Payment order ${paymentOrderId} is not verified or successful`);
  }

  const existingReceipt = await db.receipt.findFirst({
    where: { paymentOrderId },
  });

  if (existingReceipt) {
    return existingReceipt;
  }

  const receiptNumber = await generateSequentialReceiptNumber(db);

  const receipt = await db.receipt.create({
    data: {
      receiptNumber,
      paymentOrderId: paymentOrder.id,
      enrollmentId: paymentOrder.enrollmentId,
      userId: paymentOrder.userId,
      amountPaise: paymentOrder.amountPaise,
      paymentDate: new Date(),
    },
  });

  return receipt;
}
