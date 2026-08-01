import { NextResponse } from 'next/server';
import { z } from 'zod';
import { allowAuthAttempt } from '@/lib/auth-rate-limit';
import { GoogleAuthError, signInOrCreateGoogleUser, verifyGoogleIdToken } from '@/lib/google-auth';
import { CustomerLoginMethod } from '@/generated/prisma/client';
import { recordSuccessfulCustomerLogin } from '@/lib/customer-activity';

const schema = z.object({ idToken: z.string().min(100).max(10_000) });

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!allowAuthAttempt(`google-android:${ip}`, 12)) {
    return NextResponse.json({ success: false, error: { message: 'Google sign-in could not be completed. Please try again.' } }, { status: 429 });
  }
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new GoogleAuthError('INVALID_REQUEST');
    const result = await signInOrCreateGoogleUser(await verifyGoogleIdToken(parsed.data.idToken));
    await recordSuccessfulCustomerLogin(result.user.id, CustomerLoginMethod.GOOGLE, request);
    const response = NextResponse.json({ success: true, data: result });
    response.cookies.set('ratestack_scheme_session', result.token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Google sign-in could not be completed. Please try again.' } }, { status: 401 });
  }
}
