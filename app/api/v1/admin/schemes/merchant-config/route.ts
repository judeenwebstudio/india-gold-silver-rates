import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { z } from 'zod';

const merchantSchema = z.object({
  legalSellerName: z.string().min(2),
  gstin: z.string().min(15),
  invoiceIssuer: z.string().min(2),
  coinSupplier: z.string().min(2),
  fulfilmentEntity: z.string().min(2),
  refundLiableEntity: z.string().min(2),
  ownerApproved: z.boolean().default(false),
  caApproved: z.boolean().default(false),
  legalApproved: z.boolean().default(false),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const config = await prisma.merchantConfig.findUnique({
      where: { id: 'default' },
    });

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
    }

    const body = await request.json();
    const parsed = merchantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { message: parsed.error.issues[0].message } }, { status: 400 });
    }

    const allApproved = parsed.data.ownerApproved && parsed.data.caApproved && parsed.data.legalApproved;

    const config = await prisma.merchantConfig.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        ...parsed.data,
        approvedAt: allApproved ? new Date() : null,
      },
      update: {
        ...parsed.data,
        approvedAt: allApproved ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: { message: error.message } }, { status: 500 });
  }
}
