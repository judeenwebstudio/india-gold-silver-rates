/**
 * RateStack Savings Scheme Module - Razorpay Payment Gateway Adapter
 * Server-side order creation and HMAC-SHA256 signature verification.
 */

import crypto from 'crypto';

export interface CreateRazorpayOrderParams {
  orderId: string;
  amountPaise: bigint;
  currency?: string;
  receiptNumber: string;
}

export interface RazorpayOrderResponse {
  gatewayOrderId: string;
  amountPaise: bigint;
  currency: string;
  status: string;
}

export async function createRazorpayOrder(params: CreateRazorpayOrderParams): Promise<RazorpayOrderResponse> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    // If credentials are not set and we're in dev, fallback to mock with clear log
    if (process.env.NODE_ENV === 'development') {
      const { createMockPaymentOrder } = await import('./mock-gateway');
      const mock = createMockPaymentOrder({
        orderId: params.orderId,
        amountPaise: params.amountPaise,
        idempotencyKey: params.receiptNumber,
      });
      return {
        gatewayOrderId: mock.gatewayOrderId,
        amountPaise: mock.amountPaise,
        currency: mock.currency,
        status: mock.status,
      };
    }
    throw new Error('Razorpay API credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing');
  }

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${authHeader}`,
    },
    body: JSON.stringify({
      amount: Number(params.amountPaise), // Razorpay accepts amount in paise
      currency: params.currency || 'INR',
      receipt: params.receiptNumber,
      notes: {
        orderId: params.orderId,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay Order API failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return {
    gatewayOrderId: data.id,
    amountPaise: BigInt(data.amount),
    currency: data.currency,
    status: data.status,
  };
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret';
  
  if (process.env.NODE_ENV === 'development' && signature === 'mock_valid_signature') {
    return true;
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return signature === expectedSignature;
}

export function verifyRazorpayWebhookSignature(
  bodyRaw: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(bodyRaw)
    .digest('hex');

  return signature === expectedSignature;
}
