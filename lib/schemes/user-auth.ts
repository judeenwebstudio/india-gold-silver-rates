/**
 * RateStack Savings Scheme Module - End-User JWT Authentication
 * Handles registration, login, token signing & verification for web and native Android app.
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const JWT_SECRET = process.env.AUTH_SECRET || 'ratestack_scheme_jwt_secret_key_2026';

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
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export function verifySchemeToken(token: string): SchemeAuthTokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as SchemeAuthTokenPayload;
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function authenticateSchemeUserFromRequest(request: Request): Promise<SchemeAuthTokenPayload | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  let bearer = '';
  if (authHeader) {
    const trimmed = authHeader.trim();
    if (/^Bearer\s+/i.test(trimmed)) {
      bearer = trimmed.replace(/^Bearer\s+/i, '').trim();
    } else if (!trimmed.includes(' ')) {
      bearer = trimmed;
    }
  }

  const cookieHeader = request.headers.get('cookie') || request.headers.get('Cookie');
  const cookieToken = cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('ratestack_scheme_session='))
    ?.slice('ratestack_scheme_session='.length);

  const rawToken = bearer || (cookieToken ? decodeURIComponent(cookieToken) : '');
  const token = rawToken.replace(/^"|"$/g, '').trim();

  if (!token) return null;
  return verifySchemeToken(token);
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
