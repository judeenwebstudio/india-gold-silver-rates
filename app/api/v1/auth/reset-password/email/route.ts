import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashAuthToken, sendTransactionalEmail } from '@/lib/email';
import { hashPassword } from '@/lib/schemes/user-auth';
import { z } from 'zod';

const schema = z.object({ token: z.string().min(20), newPassword: z.string().min(8).regex(/[A-Za-z]/).regex(/[0-9]/) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: 'Invalid reset request.' } }, { status: 400 });
  const record = await prisma.emailAuthToken.findUnique({ where: { tokenHash: hashAuthToken(parsed.data.token) } });
  if (!record || record.purpose !== 'RESET_PASSWORD' || record.consumedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: { message: 'This password reset link is invalid or expired.' } }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.schemeUser.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } }),
    prisma.emailAuthToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
  ]);
  await sendTransactionalEmail(record.email, 'PASSWORD_CHANGED', process.env.NEXT_PUBLIC_SITE_URL);
  return NextResponse.json({ success: true, message: 'Password updated successfully.' });
}
