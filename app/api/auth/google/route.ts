import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { allowAuthAttempt } from '@/lib/auth-rate-limit';
import { safeAuthRedirect } from '@/lib/google-auth';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(new URL('/?google_error=unavailable', request.url));
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!allowAuthAttempt(`google-browser:${ip}`, 12)) return NextResponse.redirect(new URL('/?google_error=unavailable', request.url));
  const state = crypto.randomBytes(32).toString('base64url');
  const nonce = crypto.randomBytes(32).toString('base64url');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/google/callback`;
  const next = safeAuthRedirect(request.nextUrl.searchParams.get('next'));
  const mode = request.nextUrl.searchParams.get('mode') === 'connect' ? 'connect' : 'login';
  const currentUser = mode === 'connect' ? await authenticateSchemeUserFromRequest(request) : null;
  if (mode === 'connect' && !currentUser) return NextResponse.redirect(new URL('/?google_error=authentication_required', request.url));
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile',
    state, nonce, code_challenge: challenge, code_challenge_method: 'S256', prompt: 'select_account',
  }).toString();
  const response = NextResponse.redirect(authorizationUrl);
  const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 600 };
  response.cookies.set('google_oauth_state', state, cookie);
  response.cookies.set('google_oauth_nonce', nonce, cookie);
  response.cookies.set('google_oauth_verifier', verifier, cookie);
  response.cookies.set('google_oauth_next', next, cookie);
  response.cookies.set('google_oauth_mode', mode, cookie);
  if (currentUser) response.cookies.set('google_oauth_link_user', currentUser.userId, cookie);
  return response;
}
