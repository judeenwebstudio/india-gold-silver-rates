import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import {
  ACTIVE_PAYMENT_GATEWAY_KEY,
  getActivePaymentGateway,
  getGatewayConfiguration,
  type PaymentGatewayType,
} from '@/lib/schemes/gateway';
import { z } from 'zod';

const updateSchema = z.object({
  activeGateway: z.enum(['RAZORPAY', 'PHONEPE']),
});

async function authorized() {
  const session = await auth();
  return session?.user;
}

export async function GET() {
  if (!await authorized()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const activeGateway = await getActivePaymentGateway();
  return NextResponse.json({ activeGateway, gateways: getGatewayConfiguration() });
}

export async function PUT(request: Request) {
  const user = await authorized();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payment gateway' }, { status: 400 });
  }
  const activeGateway: PaymentGatewayType = parsed.data.activeGateway;
  const gateways = getGatewayConfiguration();
  const config = activeGateway === 'RAZORPAY' ? gateways.razorpay : gateways.phonepe;
  if (!config.enabled || !config.configured) {
    return NextResponse.json({ error: `${activeGateway} is not configured` }, { status: 409 });
  }
  await prisma.systemSetting.upsert({
    where: { key: ACTIVE_PAYMENT_GATEWAY_KEY },
    create: { key: ACTIVE_PAYMENT_GATEWAY_KEY, value: activeGateway },
    update: { value: activeGateway },
  });
  return NextResponse.json({ activeGateway, gateways: getGatewayConfiguration() });
}
