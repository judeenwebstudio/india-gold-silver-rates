import { normalizePhoneNumber } from '../lib/schemes/user-auth';

console.log('--- Testing Mobile Normalization ---');
const testCases = [
  { input: '+91 98765 43210', expected: '9876543210' },
  { input: '919876543210', expected: '9876543210' },
  { input: '98765-43210', expected: '9876543210' },
  { input: ' 9876543210 ', expected: '9876543210' },
  { input: '09876543210', expected: '9876543210' },
];

let allPassed = true;
for (const tc of testCases) {
  const result = normalizePhoneNumber(tc.input);
  const pass = result === tc.expected;
  console.log(`Input: "${tc.input}" -> Result: "${result}" | Expected: "${tc.expected}" | Pass: ${pass}`);
  if (!pass) allPassed = false;
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('All normalization tests passed successfully!');
}
