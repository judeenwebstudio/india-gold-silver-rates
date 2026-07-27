/**
 * RateStack Savings Scheme Module - Payment Gateway Config & Switcher
 * Supported Gateways: 'PHONEPE' (Default) | 'RAZORPAY'
 */

export type PaymentGatewayType = 'PHONEPE' | 'RAZORPAY';

export function getActivePaymentGateway(): PaymentGatewayType {
  const envGw = (process.env.PAYMENT_GATEWAY || 'PHONEPE').toUpperCase();
  if (envGw === 'RAZORPAY') {
    return 'RAZORPAY';
  }
  return 'PHONEPE';
}
