import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signSchemeToken } from '@/lib/schemes/user-auth';
import { z } from 'zod';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Phone number or email is required'),
  password: z.string().min(1, 'Password is required'),
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

    const { identifier, password } = parsed.data;

    const user = await prisma.schemeUser.findFirst({
      where: {
        OR: [{ phone: identifier }, { email: identifier }],
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid credentials' } },
        { status: 401 }
      );
    }

    const passwordValid = await comparePassword(password, user.passwordHash);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid credentials' } },
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
