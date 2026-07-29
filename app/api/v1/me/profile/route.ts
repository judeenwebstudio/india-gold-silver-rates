import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { connectGoogleAccount, verifyGoogleIdToken } from '@/lib/google-auth';

export async function GET(request: Request) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Authentication required.' } }, { status: 401 });
  const user = await prisma.schemeUser.findUnique({
    where: { id: auth.userId },
    include: { authAccounts: { select: { provider: true, providerEmail: true } } },
  });
  if (!user) return NextResponse.json({ success: false, error: { message: 'Account not found.' } }, { status: 404 });
  const google = user.authAccounts.find((account) => account.provider === 'GOOGLE');
  return NextResponse.json({ success: true, data: {
    id: user.id, fullName: user.fullName, phone: user.phone, email: user.email,
    mobileVerified: Boolean(user.mobileVerifiedAt), emailVerified: Boolean(user.emailVerifiedAt),
    googleConnected: Boolean(google), googleEmail: google?.providerEmail || null,
    profileImageUrl: user.profileImageUrl, lastLoginAt: user.lastLoginAt,
  } });
}

export async function DELETE(request: Request) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Authentication required.' } }, { status: 401 });
  const user = await prisma.schemeUser.findUnique({
    where: { id: auth.userId },
    include: { authAccounts: true },
  });
  if (!user) return NextResponse.json({ success: false, error: { message: 'Account not found.' } }, { status: 404 });
  const hasAlternative = Boolean(user.passwordHash) || Boolean(user.mobileVerifiedAt);
  if (!hasAlternative) {
    return NextResponse.json(
      { success: false, error: { message: 'Add a verified mobile number or password before disconnecting Google.' } },
      { status: 409 },
    );
  }
  await prisma.authAccount.deleteMany({ where: { userId: user.id, provider: 'GOOGLE' } });
  return NextResponse.json({ success: true, data: { googleConnected: false } });
}

export async function POST(request: Request) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Authentication required.' } }, { status: 401 });
  try {
    const body = await request.json() as { idToken?: string };
    if (!body.idToken) throw new Error('Missing token');
    const identity = await verifyGoogleIdToken(body.idToken);
    await connectGoogleAccount(auth.userId, identity);
    return NextResponse.json({ success: true, data: { googleConnected: true, googleEmail: identity.email } });
  } catch {
    return NextResponse.json(
      { success: false, error: { message: 'Google account could not be connected. Please try again.' } },
      { status: 400 },
    );
  }
}
