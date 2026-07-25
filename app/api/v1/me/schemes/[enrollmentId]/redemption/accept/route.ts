import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { z } from 'zod';

const acceptSchema = z.object({
  quotationNumber: z.string().min(1, 'Quotation number is required'),
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
    const parsed = acceptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const quotation = await prisma.redemptionQuotation.findUnique({
      where: { quotationNumber: parsed.data.quotationNumber },
      include: { redemptionRequest: true },
    });

    if (!quotation || quotation.redemptionRequest.enrollmentId !== enrollmentId) {
      return NextResponse.json(
        { success: false, error: { message: 'Quotation not found' } },
        { status: 404 }
      );
    }

    if (new Date() > quotation.validUntil) {
      return NextResponse.json(
        { success: false, error: { message: 'Quotation has expired. Please generate a new quotation with prevailing market rates.' } },
        { status: 400 }
      );
    }

    // Mark quotation userAccepted
    const now = new Date();
    await prisma.$transaction([
      prisma.redemptionQuotation.update({
        where: { id: quotation.id },
        data: {
          userAccepted: true,
          userAcceptedAt: now,
        },
      }),
      prisma.redemptionRequest.update({
        where: { id: quotation.redemptionRequestId },
        data: {
          status: quotation.netDifferencePayablePaise > BigInt(0) ? 'USER_ACCEPTED' : 'APPROVED',
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Quotation accepted by user successfully',
        netDifferencePayablePaise: quotation.netDifferencePayablePaise.toString(),
        status: quotation.netDifferencePayablePaise > BigInt(0) ? 'USER_ACCEPTED' : 'APPROVED',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to accept quotation' } },
      { status: 500 }
    );
  }
}
