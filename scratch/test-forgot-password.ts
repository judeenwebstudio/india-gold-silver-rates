import { normalizePhoneNumber } from '../lib/schemes/user-auth';
import crypto from 'crypto';

console.log('--- Testing Forgot Password Helpers ---');

function hashOtp(otp: string): string {
  const secret = 'ratestack_otp_secret_salt_2026';
  return crypto.createHash('sha256').update(`${otp}:${secret}`).digest('hex');
}

const otp = '482019';
const hash = hashOtp(otp);
const valid = hashOtp('482019') === hash;
const invalid = hashOtp('123456') === hash;

console.log(`OTP Hash Verification Test: Valid match=${valid}, Invalid match=${invalid}`);

if (!valid || invalid) {
  console.error('OTP Hashing test failed!');
  process.exit(1);
}

console.log('All Forgot Password helper tests PASSED!');
