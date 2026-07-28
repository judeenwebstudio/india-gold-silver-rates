import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthToken, hashAuthToken } from '../../lib/email';
import { normalizeEmailAddress, normalizePhoneNumber, signSchemeToken, verifySchemeToken } from '../../lib/schemes/user-auth';

test('normalizes email addresses without restricting the domain', () => {
  assert.equal(normalizeEmailAddress('  Customer@Business.Example  '), 'customer@business.example');
});

test('preserves existing Indian mobile normalization', () => {
  assert.equal(normalizePhoneNumber('+91 98765 43210'), '9876543210');
  assert.equal(normalizePhoneNumber('09876543210'), '9876543210');
});

test('email-only session tokens remain valid without a phone number', () => {
  const token = signSchemeToken('user-email', null, 'Email Customer', 'user@example.com');
  const payload = verifySchemeToken(token);
  assert.equal(payload?.userId, 'user-email');
  assert.equal(payload?.email, 'user@example.com');
  assert.equal(payload?.phone, undefined);
});

test('email verification tokens are random and stored through deterministic hashes', () => {
  const first = createAuthToken();
  const second = createAuthToken();
  assert.notEqual(first.token, second.token);
  assert.equal(hashAuthToken(first.token), first.tokenHash);
  assert.notEqual(first.tokenHash, first.token);
});
