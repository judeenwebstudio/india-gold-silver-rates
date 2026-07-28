import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuthToken, sendTransactionalEmail } from '@/lib/email';
import { normalizeEmailAddress } from '@/lib/schemes/user-auth';
import { z } from 'zod';

const generic = { success: true, message: 'If an account exists, password reset instructions have been sent.' };
export async function POST(request: Request) {
  const parsed = z.object({ email: z.string().email() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(generic);
  const email = normalizeEmailAddress(parsed.data.email);
  const user = await prisma.schemeUser.findUnique({ where: { email } });
  if (!user?.emailVerifiedAt) return NextResponse.json(generic);
  const latest = await prisma.emailAuthToken.findFirst({ where: { userId: user.id, purpose: 'RESET_PASSWORD' }, orderBy: { createdAt: 'desc' } });
  if (latest?.resendAvailableAt && latest.resendAvailableAt > new Date()) return NextResponse.json(generic);
  const { token, tokenHash } = createAuthToken();
  await prisma.emailAuthToken.updateMany({ where: { userId: user.id, purpose: 'RESET_PASSWORD', consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.emailAuthToken.create({ data: { userId: user.id, email, purpose: 'RESET_PASSWORD', tokenHash, expiresAt: new Date(Date.now() + 20 * 60_000), resendAvailableAt: new Date(Date.now() + 60_000) } });
  await sendTransactionalEmail(email, 'RESET_PASSWORD', `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/schemes/reset-password?token=${encodeURIComponent(token)}`);
  return NextResponse.json(generic);
}
