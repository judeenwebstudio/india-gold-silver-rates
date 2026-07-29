import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest, signSchemeToken } from '@/lib/schemes/user-auth';

export async function GET(request: Request) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: 'Authentication required.' } }, { status: 401 });
  const user = await prisma.schemeUser.findUnique({ where: { id: auth.userId } });
  if (!user?.isActive || user.accountStatus !== 'ACTIVE') {
    return NextResponse.json({ success: false, error: { message: 'Authentication required.' } }, { status: 401 });
  }
  const token = signSchemeToken(user.id, user.phone, user.fullName, user.email || undefined);
  const response = NextResponse.json({ success: true, data: {
    token,
    user: { id: user.id, fullName: user.fullName, phone: user.phone, email: user.email },
  } });
  response.cookies.set('ratestack_scheme_session', token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
