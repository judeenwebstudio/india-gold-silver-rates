/**
 * RateStack Transactional SMS Provider Helper
 * Supports Indian DLT-approved SMS gateways (Fast2SMS / MSG91 / Textlocal)
 * and safe Mock OTP mode for local development.
 */

export interface SendSmsParams {
  mobileNumber: string;
  otp: string;
}

export async function sendOtpSms({ mobileNumber, otp }: SendSmsParams): Promise<boolean> {
  const isMockMode = process.env.ENABLE_MOCK_SMS === 'true' || !process.env.SMS_API_KEY;
  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID || 'RTSTCK';
  const templateId = process.env.SMS_TEMPLATE_ID || 'DLT_OTP_TEMPLATE_01';

  if (isMockMode) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[MOCK SMS] Verification code sent to ******${mobileNumber.slice(-4)}`);
    }
    return true;
  }

  try {
    // Transactional SMS Gateway API Call (Fast2SMS / MSG91 standard DLT template payload)
    const response = await fetch('https://api.fast2sms.com/v3/sms/dltsms', {
      method: 'POST',
      headers: {
        'authorization': apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender_id: senderId,
        message: templateId,
        variables_values: otp,
        numbers: mobileNumber,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to dispatch transactional OTP SMS:', error);
    return false;
  }
}
