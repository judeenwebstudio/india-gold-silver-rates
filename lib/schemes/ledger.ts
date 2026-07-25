/**
 * RateStack Savings Scheme Module - Double-Entry Append-Only Financial Ledger Engine
 * Operates strictly on integer paise (BigInt).
 * Direct balance mutations without a corresponding ledger entry are forbidden.
 */

import { prisma } from '@/lib/prisma';
import { LedgerEntryType, Prisma } from '@/generated/prisma/client';

export interface PostLedgerEntryParams {
  enrollmentId: string;
  type: LedgerEntryType;
  amountPaise: bigint; // positive for credit, negative for debit
  referenceType: 'PAYMENT_ORDER' | 'MANUAL_ENTRY' | 'REVERSAL' | 'REDEMPTION' | 'REFUND';
  referenceId: string;
  paymentOrderId?: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  actorId?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface LedgerPostingResult {
  ledgerEntryId: string;
  enrollmentId: string;
  previousBalancePaise: bigint;
  amountPaise: bigint;
  newBalancePaise: bigint;
}

export async function postLedgerEntry(
  params: PostLedgerEntryParams,
  txClient?: Prisma.TransactionClient
): Promise<LedgerPostingResult> {
  const db = txClient || prisma;

  return await db.$transaction(async (tx) => {
    // 1. Fetch current enrollment with lock/fresh state
    const enrollment = await tx.schemeEnrollment.findUnique({
      where: { id: params.enrollmentId },
      select: { id: true, eligiblePurchaseBalancePaise: true },
    });

    if (!enrollment) {
      throw new Error(`Scheme enrollment ${params.enrollmentId} not found`);
    }

    const previousBalance = enrollment.eligiblePurchaseBalancePaise;
    const newBalance = previousBalance + params.amountPaise;

    if (newBalance < 0n) {
      throw new Error(
        `Insufficient Scheme Purchase Balance. Current: ${previousBalance} paise, Attempted Debit: ${params.amountPaise} paise`
      );
    }

    // 2. Append immutable ledger entry
    const entry = await tx.schemeLedgerEntry.create({
      data: {
        enrollmentId: params.enrollmentId,
        type: params.type,
        amountPaise: params.amountPaise,
        balanceAfterPaise: newBalance,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        paymentOrderId: params.paymentOrderId,
        actorType: params.actorType,
        actorId: params.actorId,
        metadata: params.metadata,
      },
    });

    // 3. Update eligiblePurchaseBalancePaise on enrollment strictly matching ledger
    await tx.schemeEnrollment.update({
      where: { id: params.enrollmentId },
      data: {
        eligiblePurchaseBalancePaise: newBalance,
        updatedAt: new Date(),
      },
    });

    return {
      ledgerEntryId: entry.id,
      enrollmentId: params.enrollmentId,
      previousBalancePaise: previousBalance,
      amountPaise: params.amountPaise,
      newBalancePaise: newBalance,
    };
  });
}
