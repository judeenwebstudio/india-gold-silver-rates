import { NextResponse } from 'next/server';
import { getActivePaymentGateway, getGatewayConfiguration } from '@/lib/schemes/gateway';

export const dynamic = 'force-dynamic';

export async function GET() {
  const activeGateway = await getActivePaymentGateway();
  const gateways = getGatewayConfiguration();

  return NextResponse.json({
    activeGateway,
    razorpay: {
      enabled: activeGateway === 'RAZORPAY' && gateways.razorpay.enabled && gateways.razorpay.configured,
      ...(activeGateway === 'RAZORPAY' && gateways.razorpay.configured
        ? { keyId: process.env.RAZORPAY_KEY_ID }
        : {}),
    },
    phonepe: {
      enabled: activeGateway === 'PHONEPE' && gateways.phonepe.enabled && gateways.phonepe.configured,
    },
  }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
