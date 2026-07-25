import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, normalizePhoneNumber, signSchemeToken } from '@/lib/schemes/user-auth';
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
    const normalizedPhone = normalizePhoneNumber(rawId);
    const password = parsed.data.password;

    const user = await prisma.schemeUser.findFirst({
      where: {
        OR: [
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
          { phone: rawId },
          { email: rawId.toLowerCase() },
        ],
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'No account found. Please register.' } },
        { status: 404 }
      );
    }

    const passwordValid = await comparePassword(password, user.passwordHash);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: { message: 'Incorrect mobile number or password.' } },
        { status: 401 }
      );
    }

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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Login failed' } },
      { status: 500 }
    );
  }
}
