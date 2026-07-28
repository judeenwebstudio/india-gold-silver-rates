import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuthToken, sendTransactionalEmail } from '@/lib/email';
import { normalizeEmailAddress } from '@/lib/schemes/user-auth';
import { z } from 'zod';

const response = { success: true, message: 'If verification is pending, a new email will be sent.' };
export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(response);
  const email = normalizeEmailAddress(parsed.data.email);
  const user = await prisma.schemeUser.findUnique({ where: { email } });
  if (!user || user.emailVerifiedAt) return NextResponse.json(response);
  const latest = await prisma.emailAuthToken.findFirst({ where: { userId: user.id, purpose: 'VERIFY_EMAIL' }, orderBy: { createdAt: 'desc' } });
  if (latest && (latest.resendAvailableAt > new Date() || latest.resendCount >= 5)) return NextResponse.json(response);
  const { token, tokenHash } = createAuthToken();
  await prisma.$transaction([
    prisma.emailAuthToken.updateMany({ where: { userId: user.id, purpose: 'VERIFY_EMAIL', consumedAt: null }, data: { consumedAt: new Date() } }),
    prisma.emailAuthToken.create({ data: { userId: user.id, email, purpose: 'VERIFY_EMAIL', tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000), resendAvailableAt: new Date(Date.now() + 60_000), resendCount: (latest?.resendCount || 0) + 1 } }),
  ]);
  await sendTransactionalEmail(email, 'VERIFY_EMAIL', `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/schemes/verify-email?token=${encodeURIComponent(token)}`);
  return NextResponse.json(response);
}
