import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashAuthToken } from '@/lib/email';
import { signSchemeToken } from '@/lib/schemes/user-auth';
import { z } from 'zod';

export async function POST(request: Request) {
  const parsed = z.object({ token: z.string().min(20) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: 'Invalid verification link.' } }, { status: 400 });
  const record = await prisma.emailAuthToken.findUnique({ where: { tokenHash: hashAuthToken(parsed.data.token) } });
  if (!record || record.purpose !== 'VERIFY_EMAIL' || record.consumedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ success: false, error: { message: 'This verification link is invalid or expired.' } }, { status: 400 });
  }
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.schemeUser.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } });
    await tx.emailAuthToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    return updated;
  });
  return NextResponse.json({ success: true, data: { token: signSchemeToken(user.id, user.phone, user.fullName, user.email || undefined) } });
}
