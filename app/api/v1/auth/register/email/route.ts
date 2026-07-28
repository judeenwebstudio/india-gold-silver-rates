import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAuthToken, sendTransactionalEmail } from '@/lib/email';
import { hashPassword, normalizeEmailAddress } from '@/lib/schemes/user-auth';
import { z } from 'zod';

const schema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: parsed.error.issues[0].message } }, { status: 400 });
  const email = normalizeEmailAddress(parsed.data.email);
  if (await prisma.schemeUser.findUnique({ where: { email }, select: { id: true } })) {
    return NextResponse.json({ success: false, error: { message: 'An account with this email address already exists.' } }, { status: 409 });
  }
  const user = await prisma.schemeUser.create({
    data: { fullName: parsed.data.fullName, email, phone: null, passwordHash: await hashPassword(parsed.data.password), preferredLoginMethod: 'EMAIL' },
  });
  const { token, tokenHash } = createAuthToken();
  await prisma.emailAuthToken.create({
    data: { userId: user.id, email, purpose: 'VERIFY_EMAIL', tokenHash, expiresAt: new Date(Date.now() + 30 * 60_000), resendAvailableAt: new Date(Date.now() + 60_000) },
  });
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  await sendTransactionalEmail(email, 'VERIFY_EMAIL', `${site}/schemes/verify-email?token=${encodeURIComponent(token)}`);
  return NextResponse.json({ success: true, data: { verificationRequired: true, user: { id: user.id, fullName: user.fullName, email } } }, { status: 201 });
}
