/**
 * RateStack Savings Scheme Module - PhonePe Payment Gateway Adapter
 */

import crypto from 'crypto';

export interface CreatePhonePeOrderParams {
  orderId: string;
  amountPaise: bigint | number;
  receiptNumber: string;
  userId: string;
  mobileNumber?: string;
  enrollmentId: string;
}

export interface PhonePeOrderResponse {
  gatewayOrderId: string;
  merchantTransactionId: string;
  redirectUrl: string;
  amountPaise: number;
  currency: string;
  status: string;
  merchantId: string;
}

export function getPhonePeConfig() {
  const merchantId = process.env.PHONEPE_MERCHANT_ID?.trim() || '';
  const saltKey = process.env.PHONEPE_SALT_KEY?.trim() || '';
  const saltIndex = process.env.PHONEPE_SALT_INDEX?.trim() || '';
  const env = (process.env.PHONEPE_ENV || 'PRODUCTION').toUpperCase();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://india-gold-silver-rates.vercel.app').replace(/\/$/, '');

  if (!merchantId || !saltKey || !saltIndex) {
    throw new Error('PhonePe credentials are missing');
  }

  const baseUrl = env === 'PRODUCTION'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

  return {
    merchantId,
    saltKey,
    saltIndex,
    env,
    baseUrl,
    siteUrl,
  };
}

export function calculatePhonePeChecksum(base64Payload: string, apiEndpoint: string, saltKey: string, saltIndex: string): string {
  const dataToHash = base64Payload + apiEndpoint + saltKey;
  const sha256 = crypto.createHash('sha256').update(dataToHash).digest('hex');
  return `${sha256}###${saltIndex}`;
}

export function calculatePhonePeStatusChecksum(merchantId: string, merchantTransactionId: string, saltKey: string, saltIndex: string): string {
  const apiEndpoint = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
  const dataToHash = apiEndpoint + saltKey;
  const sha256 = crypto.createHash('sha256').update(dataToHash).digest('hex');
  return `${sha256}###${saltIndex}`;
}

export function verifyPhonePeCallbackChecksum(responseBase64: string, xVerifyHeader: string, saltKey: string): boolean {
  if (!xVerifyHeader) return false;
  const [sha256] = xVerifyHeader.split('###');
  const dataToHash = responseBase64 + saltKey;
  const computedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');
  return computedHash === sha256;
}

export async function createPhonePeOrder(params: CreatePhonePeOrderParams): Promise<PhonePeOrderResponse> {
  const config = getPhonePeConfig();
  const amountNumber = typeof params.amountPaise === 'bigint' ? Number(params.amountPaise) : params.amountPaise;

  const payloadObj = {
    merchantId: config.merchantId,
    merchantTransactionId: params.orderId,
    merchantUserId: params.userId,
    amount: amountNumber,
    redirectUrl: `${config.siteUrl}/api/v1/me/schemes/callback/phonepe?enrollmentId=${params.enrollmentId}&orderId=${params.orderId}`,
    redirectMode: 'POST',
    callbackUrl: `${config.siteUrl}/api/v1/webhooks/phonepe`,
    mobileNumber: (params.mobileNumber || '9999999999').replace(/\D/g, '').slice(-10),
    paymentInstrument: {
      type: 'PAY_PAGE',
    },
  };

  const jsonString = JSON.stringify(payloadObj);
  const base64Payload = Buffer.from(jsonString).toString('base64');
  const apiEndpoint = '/pg/v1/pay';
  const checksum = calculatePhonePeChecksum(base64Payload, apiEndpoint, config.saltKey, config.saltIndex);

  try {
    const res = await fetch(`${config.baseUrl}${apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const resData = await res.json().catch(() => ({}));
    const redirectUrl = resData.data?.instrumentResponse?.redirectInfo?.url;
    if (!res.ok || !resData.success || typeof redirectUrl !== 'string' || !redirectUrl.startsWith('https://')) {
      throw new Error(`PhonePe order creation failed${resData.code ? ` (${resData.code})` : ''}`);
    }

    return {
      gatewayOrderId: params.orderId,
      merchantTransactionId: params.orderId,
      redirectUrl,
      amountPaise: amountNumber,
      currency: 'INR',
      status: resData.code || 'PAYMENT_INITIATED',
      merchantId: config.merchantId,
    };
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error('PhonePe order creation failed');
  }
}

export async function checkPhonePePaymentStatus(merchantTransactionId: string) {
  const config = getPhonePeConfig();

  try {
    const apiEndpoint = `/pg/v1/status/${config.merchantId}/${merchantTransactionId}`;
    const checksum = calculatePhonePeStatusChecksum(config.merchantId, merchantTransactionId, config.saltKey, config.saltIndex);

    const res = await fetch(`${config.baseUrl}${apiEndpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': config.merchantId,
      },
    });

    const resData = await res.json().catch(() => ({}));
    if (resData.success === true && (resData.code === 'PAYMENT_SUCCESS' || resData.data?.responseCode === 'SUCCESS')) {
      return {
        success: true,
        code: resData.code || 'PAYMENT_SUCCESS',
        message: resData.message || 'Payment Successful',
        data: resData.data,
      };
    }
  } catch (err) {
    return {
      success: false,
      code: 'PAYMENT_STATUS_UNAVAILABLE',
      message: err instanceof Error ? err.message : 'PhonePe payment status unavailable',
      data: undefined,
    };
  }

  return {
    success: false,
    code: 'PAYMENT_NOT_SUCCESSFUL',
    message: 'PhonePe did not confirm the payment',
    data: undefined,
  };
}
