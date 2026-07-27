async function main() {
  const baseUrl = 'https://india-gold-silver-rates.vercel.app';
  console.log(`--- Testing Remote Payment Order API against ${baseUrl} ---`);

  // 1. Login
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9176585663', password: 'Password123!' }),
  });

  const loginData = await loginRes.json();
  console.log(`Login Status: ${loginRes.status}, Success: ${loginData.success}`);

  if (!loginData.success || !loginData.data?.token) {
    console.error('Login failed:', loginData.error);
    return;
  }

  const token = loginData.data.token;
  console.log('Login successful! Token acquired.');

  // 2. Call Order Creation for RS-SCH-2026-00009 (cms2say3m000004jlq9831lrs)
  const enrollmentId = 'cms2say3m000004jlq9831lrs';
  console.log(`Calling POST /api/v1/me/schemes/${enrollmentId}/payments/order...`);

  const orderRes = await fetch(`${baseUrl}/api/v1/me/schemes/${enrollmentId}/payments/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ gateway: 'RAZORPAY' }),
  });

  console.log(`Order API HTTP Status: ${orderRes.status}`);
  const orderData = await orderRes.json();
  console.log('Order API JSON Response:', JSON.stringify(orderData, null, 2));
}

main().catch(console.error);
