import assert from "node:assert/strict";
import test from "node:test";
import { signSchemeToken, authenticateSchemeUserFromRequest } from "../lib/schemes/user-auth";

test("GET /api/v1/me/dashboard accepts Bearer tokens, raw tokens, and session cookies", async () => {
  const sampleToken = signSchemeToken("test-user-id", "9876543210", "Test Customer", "test@example.com");
  const maskedToken = `Bearer ${sampleToken.substring(0, 20)}...********`;

  // 1. Android Header with standard 'Bearer <token>'
  const androidHeaders = new Headers({
    "Authorization": `Bearer ${sampleToken}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "RateStack-Android/1.0",
    "X-RateStack-Platform": "ANDROID",
  });
  const reqAndroid = new Request("http://localhost:3000/api/v1/me/dashboard", { headers: androidHeaders });
  const authAndroid = await authenticateSchemeUserFromRequest(reqAndroid);

  assert.ok(authAndroid, "Android Bearer token must be authenticated successfully");
  assert.equal(authAndroid?.userId, "test-user-id");
  assert.equal(authAndroid?.fullName, "Test Customer");

  // 2. Android Header with raw token without 'Bearer ' prefix
  const androidRawHeaders = new Headers({
    "Authorization": sampleToken,
    "Accept": "application/json",
    "User-Agent": "RateStack-Android/1.0",
  });
  const reqAndroidRaw = new Request("http://localhost:3000/api/v1/me/dashboard", { headers: androidRawHeaders });
  const authAndroidRaw = await authenticateSchemeUserFromRequest(reqAndroidRaw);
  assert.ok(authAndroidRaw, "Android raw token must be authenticated successfully");

  // 3. Website Cookie header
  const websiteHeaders = new Headers({
    "Cookie": `ratestack_scheme_session=${encodeURIComponent(sampleToken)}`,
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Linux; Android 14)",
  });
  const reqWebsite = new Request("http://localhost:3000/api/v1/me/dashboard", { headers: websiteHeaders });
  const authWebsite = await authenticateSchemeUserFromRequest(reqWebsite);
  assert.ok(authWebsite, "Website Cookie token must be authenticated successfully");

  console.log("--------------------------------------------------");
  console.log("AUTHENTICATED DASHBOARD HEADERS COMPARISON:");
  console.log("--------------------------------------------------");
  console.log("Android Outgoing Request Headers:");
  console.log(`  Authorization: ${maskedToken}`);
  console.log(`  Accept: application/json`);
  console.log(`  Content-Type: application/json`);
  console.log(`  User-Agent: RateStack-Android/1.0`);
  console.log("Website Outgoing Request Headers:");
  console.log(`  Cookie: ratestack_scheme_session=${sampleToken.substring(0, 15)}...`);
  console.log(`  Accept: application/json`);
  console.log(`  User-Agent: Mozilla/5.0 (Linux; Android 14)`);
  console.log("--------------------------------------------------");
});
