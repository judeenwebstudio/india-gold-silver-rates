/**
 * RateStack Savings Scheme Module - End-User JWT Authentication
 * Handles registration, login, token signing & verification for web and native Android app.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function getJwtSecret(): string {
  return process.env.AUTH_SECRET || 'ratestack_scheme_jwt_secret_key_2026';
}

export interface SchemeAuthTokenPayload {
  userId: string;
  phone?: string;
  email?: string;
  fullName: string;
  exp: number;
}

export function signSchemeToken(userId: string, phone: string | null | undefined, fullName: string, email?: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days
  const payload = Buffer.from(
    JSON.stringify({ userId, ...(phone ? { phone } : {}), ...(email ? { email } : {}), fullName, exp })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export function verifySchemeToken(token: string): SchemeAuthTokenPayload | null {
  try {
    const cleanToken = decodeURIComponent(token.trim()).replace(/^["']|["']$/g, '').trim();
    const parts = cleanToken.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${header}.${payload}`)
      .digest('base64url');

    const supplied = Buffer.from(signature);
    const expected = Buffer.from(expectedSig);
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as SchemeAuthTokenPayload;
    if (typeof decoded.userId !== 'string' || !decoded.userId || !Number.isFinite(decoded.exp) || decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return decoded;
  } catch {
    return null;
  }
}

export type CustomerSessionLookup = (id: string) => Promise<{ isActive: boolean; accountStatus: string; deletedAt: Date | null } | null>;

async function lookupCustomerSession(id: string) {
  const { prisma } = await import('@/lib/prisma');
  return prisma.schemeUser.findUnique({ where: { id }, select: { isActive: true, accountStatus: true, deletedAt: true } });
}

export async function authenticateSchemeUserFromRequest(request: Request, lookup: CustomerSessionLookup = lookupCustomerSession): Promise<SchemeAuthTokenPayload | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  let bearer = '';
  if (authHeader) {
    let trimmed = authHeader.trim();
    while (/^Bearer\s+/i.test(trimmed)) {
      trimmed = trimmed.replace(/^Bearer\s+/i, '').trim();
    }
    bearer = trimmed;
  }

  const cookieHeader = request.headers.get('cookie') || request.headers.get('Cookie');
  const cookieToken = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('ratestack_scheme_session='))
    ?.slice('ratestack_scheme_session='.length);

  try {
    const rawToken = bearer || (cookieToken ? decodeURIComponent(cookieToken) : '');
    if (!rawToken) return null;
    const payload = verifySchemeToken(rawToken);
    if (!payload) return null;
    // No cache: legacy JWTs and the session-refresh endpoint must be revoked at
    // the same commit that anonymizes the customer, on every app instance.
    const user = await lookup(payload.userId);
    return user?.isActive && user.accountStatus === 'ACTIVE' && !user.deletedAt ? payload : null;
  } catch {
    // A failed revocation lookup must never fall back to signature-only auth.
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.substring(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  return digits;
}

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}
