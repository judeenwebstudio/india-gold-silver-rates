import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, normalizePhoneNumber, signSchemeToken } from '@/lib/schemes/user-auth';
import { z } from 'zod';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const { fullName, phone: rawPhone, email, password, address, city, state, pincode } = parsed.data;
    const normalizedPhone = normalizePhoneNumber(rawPhone);

    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: { message: 'Please enter a valid 10-digit mobile number' } },
        { status: 400 }
      );
    }

    // Check existing phone
    const existingPhone = await prisma.schemeUser.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: rawPhone },
        ],
      },
    });

    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: { message: 'An account with this phone number already exists' } },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.schemeUser.create({
      data: {
        fullName,
        phone: normalizedPhone,
        email: email || null,
        passwordHash,
        address: address || null,
        city: city || null,
        state: state || null,
        pincode: pincode || null,
      },
    });

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
      { success: false, error: { message: error.message || 'Registration failed' } },
      { status: 500 }
    );
  }
}
