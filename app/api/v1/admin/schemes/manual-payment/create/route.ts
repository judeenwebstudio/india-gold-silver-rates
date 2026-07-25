import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { inrToPaise } from '@/lib/schemes/precision';
import { z } from 'zod';

const createManualSchema = z.object({
  enrollmentId: z.string().min(1),
  amount: z.number().positive(),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'POS']),
  referenceNumber: z.string().optional(),
  proofDocumentUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createManualSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { message: parsed.error.issues[0].message } }, { status: 400 });
    }

    const { enrollmentId, amount, paymentMode, referenceNumber, proofDocumentUrl } = parsed.data;

    const enrollment = await prisma.schemeEnrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return NextResponse.json({ success: false, error: { message: 'Enrollment not found' } }, { status: 404 });
    }

    const entry = await prisma.manualPaymentQueue.create({
      data: {
        enrollmentId,
        amountPaise: inrToPaise(amount),
        paymentMode,
        referenceNumber: referenceNumber || null,
        makerAdminId: session.user.id,
        status: 'PENDING_APPROVAL',
        proofDocumentUrl: proofDocumentUrl || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: entry.id,
        message: 'Manual payment submitted for Maker-Checker approval. Pending Checker review.',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
