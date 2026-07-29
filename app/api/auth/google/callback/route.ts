import { NextRequest, NextResponse } from 'next/server';
import { connectGoogleAccount, exchangeGoogleAuthorizationCode, GOOGLE_SESSION_COOKIE, safeAuthRedirect, signInOrCreateGoogleUser, verifyGoogleIdToken } from '@/lib/google-auth';

const oauthCookies = ['google_oauth_state', 'google_oauth_nonce', 'google_oauth_verifier', 'google_oauth_next', 'google_oauth_mode', 'google_oauth_link_user'];
function clearOAuthCookies(response: NextResponse) { for (const name of oauthCookies) response.cookies.delete(name); }

export async function GET(request: NextRequest) {
  const next = safeAuthRedirect(request.cookies.get('google_oauth_next')?.value);
  const failure = () => {
    const url = new URL(next, request.nextUrl.origin);
    url.searchParams.set('google_error', 'unavailable');
    const response = NextResponse.redirect(url);
    clearOAuthCookies(response);
    return response;
  };
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const expectedState = request.cookies.get('google_oauth_state')?.value;
    const nonce = request.cookies.get('google_oauth_nonce')?.value;
    const verifier = request.cookies.get('google_oauth_verifier')?.value;
    if (!code || !state || !expectedState || state !== expectedState || !nonce || !verifier) return failure();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/google/callback`;
    const idToken = await exchangeGoogleAuthorizationCode(code, redirectUri, verifier);
    const identity = await verifyGoogleIdToken(idToken, [process.env.GOOGLE_CLIENT_ID || ''], nonce);
    const mode = request.cookies.get('google_oauth_mode')?.value;
    const linkUserId = request.cookies.get('google_oauth_link_user')?.value;
    if (mode === 'connect' && linkUserId) await connectGoogleAccount(linkUserId, identity);
    const result = await signInOrCreateGoogleUser(identity);
    const completion = new URL('/auth/google/complete', request.nextUrl.origin);
    completion.searchParams.set('next', next);
    const response = NextResponse.redirect(completion);
    response.cookies.set(GOOGLE_SESSION_COOKIE, result.token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
    });
    clearOAuthCookies(response);
    return response;
  } catch {
    return failure();
  }
}
