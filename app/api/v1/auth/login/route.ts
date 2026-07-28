import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, normalizeEmailAddress, normalizePhoneNumber, signSchemeToken } from '@/lib/schemes/user-auth';
import { z } from 'zod';

const loginSchema = z.object({
  identifier: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
}).refine((data) => data.identifier || data.phone, {
  message: 'Mobile number or email is required',
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const rawId = (parsed.data.identifier || parsed.data.phone || '').trim();
    const isEmail = rawId.includes('@');
    const normalizedPhone = isEmail ? '' : normalizePhoneNumber(rawId);
    const normalizedEmail = isEmail ? normalizeEmailAddress(rawId) : '';
    const password = parsed.data.password;

    const user = await prisma.schemeUser.findFirst({
      where: {
        OR: [
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          { phone: rawId },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid login details.' } },
        { status: 401 }
      );
    }

    const passwordValid = await comparePassword(password, user.passwordHash);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid login details.' } },
        { status: 401 }
      );
    }

    if (isEmail && !user.emailVerifiedAt) {
      return NextResponse.json(
        { success: false, error: { message: 'Please verify your email address before signing in.', code: 'EMAIL_NOT_VERIFIED' } },
        { status: 403 }
      );
    }
    await prisma.schemeUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = signSchemeToken(user.id, user.phone, user.fullName, user.email || undefined);

    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
}
