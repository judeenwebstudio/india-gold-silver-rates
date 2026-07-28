/**
 * RateStack Savings Scheme Module - Payment Gateway Config & Switcher
 * The database value is authoritative for website and Android clients.
 */
import { prisma } from '@/lib/prisma';

export type PaymentGatewayType = 'PHONEPE' | 'RAZORPAY';
export const ACTIVE_PAYMENT_GATEWAY_KEY = 'activePaymentGateway';

export function normalizePaymentGateway(value?: string | null): PaymentGatewayType {
  return value?.toUpperCase() === 'PHONEPE' ? 'PHONEPE' : 'RAZORPAY';
}

export async function getActivePaymentGateway(): Promise<PaymentGatewayType> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: ACTIVE_PAYMENT_GATEWAY_KEY },
      select: { value: true },
    });
    return normalizePaymentGateway(setting?.value);
  } catch {
    return 'RAZORPAY';
  }
}

export function getGatewayConfiguration() {
  return {
    razorpay: {
      enabled: true,
      configured: Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim()),
    },
    phonepe: {
      enabled: true,
      configured: Boolean(
        process.env.PHONEPE_MERCHANT_ID?.trim()
        && process.env.PHONEPE_SALT_KEY?.trim()
        && process.env.PHONEPE_SALT_INDEX?.trim()
      ),
      status: process.env.PHONEPE_MERCHANT_STATUS?.trim() || 'BLOCKED_MERCHANT',
    },
  };
}
