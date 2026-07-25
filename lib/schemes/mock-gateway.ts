/**
 * RateStack Savings Scheme Module - Mock Payment Gateway Adapter
 * STRICTLY FORBIDDEN IN PRODUCTION (`NODE_ENV === 'production'`)
 */

import crypto from 'crypto';

export interface CreateMockOrderParams {
  orderId: string;
  amountPaise: bigint;
  currency?: string;
  idempotencyKey: string;
}

export interface MockOrderResponse {
  gatewayOrderId: string;
  amountPaise: bigint;
  currency: string;
  status: 'created';
}

export function createMockPaymentOrder(params: CreateMockOrderParams): MockOrderResponse {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY VIOLATION: Mock payment gateway cannot operate in production environment!');
  }

  const gatewayOrderId = `mock_ord_${params.orderId}_${crypto.randomBytes(4).toString('hex')}`;

  return {
    gatewayOrderId,
    amountPaise: params.amountPaise,
    currency: params.currency || 'INR',
    status: 'created',
  };
}

export function verifyMockPaymentSignature(
  gatewayOrderId: string,
  gatewayPaymentId: string,
  signature: string
): boolean {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CRITICAL SECURITY VIOLATION: Mock payment gateway cannot operate in production environment!');
  }

  // Mock verification signature format: sha256(gatewayOrderId + "|" + gatewayPaymentId + "|mock_secret")
  const expectedSignature = crypto
    .createHmac('sha256', process.env.MOCK_PAYMENT_SECRET || 'mock_ratestack_secret')
    .update(`${gatewayOrderId}|${gatewayPaymentId}`)
    .digest('hex');

  return signature === expectedSignature || signature === 'mock_valid_signature';
}
