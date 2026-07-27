import 'dotenv/config';
import { getActivePaymentGateway } from '../lib/schemes/gateway.js';
import { createPhonePeOrder, getPhonePeConfig } from '../lib/schemes/phonepe.js';

async function main() {
  console.log('--- Runtime Gateway Resolution Audit ---');
  console.log('process.env.PAYMENT_GATEWAY:', process.env.PAYMENT_GATEWAY);
  console.log('process.env.NODE_ENV:', process.env.NODE_ENV);
  console.log('process.env.PHONEPE_MERCHANT_ID:', process.env.PHONEPE_MERCHANT_ID);

  const activeGateway = getActivePaymentGateway();
  console.log('Detected Active Gateway:', activeGateway);

  const config = getPhonePeConfig();
  console.log('PhonePe Config:', {
    merchantId: config.merchantId,
    env: config.env,
    baseUrl: config.baseUrl,
    siteUrl: config.siteUrl,
  });

  try {
    const phonePeOrder = await createPhonePeOrder({
      orderId: `TEST-ORD-${Date.now()}`,
      amountPaise: 20000n,
      receiptNumber: 'RCP-TEST',
      userId: 'test_user_id',
      mobileNumber: '9998887770',
      enrollmentId: 'test_enrollment_id',
    });
    console.log('PhonePe Order Initiated Successfully:');
    console.log(' - merchantTransactionId:', phonePeOrder.merchantTransactionId);
    console.log(' - redirectUrl:', phonePeOrder.redirectUrl);
    console.log(' - gatewayOrderId:', phonePeOrder.gatewayOrderId);
  } catch (err: any) {
    console.error('PhonePe Order Initiation Failed:', err.message);
  }
}

main().catch(console.error);
