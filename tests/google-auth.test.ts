import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { GoogleAuthError, safeAuthRedirect, verifyGoogleIdToken } from '../lib/google-auth';

const root = process.cwd();
const originalFetch = global.fetch;
const validClaims = {
  iss: 'https://accounts.google.com',
  aud: 'web-client',
  sub: 'google-subject-123',
  email: 'Verified.User@Example.com',
  email_verified: 'true',
  name: 'Verified User',
  exp: String(Math.floor(Date.now() / 1000) + 3600),
  nonce: 'expected-nonce',
};

async function verifyWith(claims: Record<string, string>, audiences = ['web-client'], nonce = 'expected-nonce') {
  global.fetch = async () => new Response(JSON.stringify(claims), { status: 200 });
  try {
    return await verifyGoogleIdToken('signed-google-id-token', audiences, nonce);
  } finally {
    global.fetch = originalFetch;
  }
}

test('verified Google identity is accepted and normalized', async () => {
  const identity = await verifyWith(validClaims);
  assert.equal(identity.sub, validClaims.sub);
  assert.equal(identity.email, 'verified.user@example.com');
  assert.equal(identity.emailVerified, true);
});

for (const [name, claims, code] of [
  ['unverified email', { ...validClaims, email_verified: 'false' }, 'UNVERIFIED_GOOGLE_EMAIL'],
  ['expired token', { ...validClaims, exp: '1' }, 'EXPIRED_TOKEN'],
  ['wrong audience', { ...validClaims, aud: 'attacker-client' }, 'INVALID_AUDIENCE'],
  ['wrong issuer', { ...validClaims, iss: 'https://example.com' }, 'INVALID_ISSUER'],
] as const) {
  test(`${name} is rejected`, async () => {
    await assert.rejects(() => verifyWith(claims), (error: unknown) => error instanceof GoogleAuthError && error.code === code);
  });
}

test('invalid token response is rejected safely', async () => {
  global.fetch = async () => new Response('{}', { status: 400 });
  try {
    await assert.rejects(() => verifyGoogleIdToken('invalid-token', ['web-client']), GoogleAuthError);
  } finally {
    global.fetch = originalFetch;
  }
});

test('redirect sanitizer preserves Shop and rejects external redirects', () => {
  assert.equal(safeAuthRedirect('/shop'), '/shop');
  assert.equal(safeAuthRedirect('//attacker.example'), '/schemes/dashboard');
  assert.equal(safeAuthRedirect('https://attacker.example'), '/schemes/dashboard');
});

test('Google persistence links verified email without replacing existing user IDs', async () => {
  const service = await readFile(path.join(root, 'lib/google-auth.ts'), 'utf8');
  const migration = await readFile(path.join(root, 'prisma/migrations/20260729003000_add_google_auth_accounts/migration.sql'), 'utf8');
  assert.match(service, /findUnique\(\{ where: \{ email: identity\.email \} \}\)/);
  assert.match(service, /userId: existingEmailUser\.id/);
  assert.match(service, /where: \{ id: linked\.user\.id \}[\s\S]*lastLoginAt: new Date\(\)/);
  assert.doesNotMatch(service, /fullName.*findUnique|findUnique.*fullName/);
  assert.match(service, /accountStatus !== 'ACTIVE'/);
  assert.match(migration, /UNIQUE INDEX "AuthAccount_provider_providerAccountId_key"/);
  assert.match(migration, /ALTER COLUMN "passwordHash" DROP NOT NULL/);
});

test('browser, Android, profile and compatibility surfaces are wired', async () => {
  const browserStart = await readFile(path.join(root, 'app/api/auth/google/route.ts'), 'utf8');
  const callback = await readFile(path.join(root, 'app/api/auth/google/callback/route.ts'), 'utf8');
  const androidApi = await readFile(path.join(root, 'app/api/v1/auth/google/route.ts'), 'utf8');
  const profile = await readFile(path.join(root, 'app/api/v1/me/profile/route.ts'), 'utf8');
  const modal = await readFile(path.join(root, 'components/AuthModal.tsx'), 'utf8');
  const androidButton = await readFile(path.join(root, 'android-ratestack/app/src/main/java/com/ratestack/app/ui/schemes/GoogleSignInButton.kt'), 'utf8');
  const login = await readFile(path.join(root, 'app/api/v1/auth/login/route.ts'), 'utf8');
  assert.match(browserStart, /state.*nonce.*code_challenge/s);
  assert.match(callback, /verifyGoogleIdToken/);
  assert.match(androidApi, /idToken/);
  assert.match(profile, /Add a verified mobile number or password before disconnecting Google/);
  assert.match(modal, /Continue with Google/);
  assert.match(androidButton, /CredentialManager/);
  assert.match(login, /user\.passwordHash \?/);
});
