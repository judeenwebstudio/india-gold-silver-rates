import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/schemes/user-auth';
import crypto from 'crypto';

const SECRET_HASH_SALT = process.env.AUTH_SECRET || 'ratestack_otp_secret_salt_2026';

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(`${otp}:${SECRET_HASH_SALT}`).digest('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(`${token}:${SECRET_HASH_SALT}`).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawMobile = (body.mobileNumber || body.phone || body.identifier || '').trim();
    const normalizedMobile = normalizePhoneNumber(rawMobile);
    const submittedOtp = (body.otp || '').trim();

    if (!normalizedMobile || normalizedMobile.length < 10) {
      return NextResponse.json(
        { success: false, error: { message: 'Enter a valid 10-digit mobile number.' } },
        { status: 400 }
      );
    }

    if (!submittedOtp || submittedOtp.length !== 6) {
      return NextResponse.json(
        { success: false, error: { message: 'Enter a valid 6-digit verification code.' } },
        { status: 400 }
      );
    }

    // Find the latest active OTP record for this mobile number
    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        mobileNumber: normalizedMobile,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: { message: 'The verification code has expired. Please request a new one.' } },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > otpRecord.expiresAt) {
      return NextResponse.json(
        { success: false, error: { message: 'The verification code has expired. Please request a new one.' } },
        { status: 400 }
      );
    }

    // Check attempt limits
    if (otpRecord.attemptCount >= 5) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many attempts. Please try again later.' } },
        { status: 429 }
      );
    }

    // Hash submitted OTP and verify
    const submittedHash = hashOtp(submittedOtp);

    if (submittedHash !== otpRecord.otpHash) {
      // Increment failed attempt count
      await prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { attemptCount: otpRecord.attemptCount + 1 },
      });

      return NextResponse.json(
        { success: false, error: { message: 'The verification code is incorrect.' } },
        { status: 400 }
      );
    }

    // OTP Verified Successfully -> Issue short-lived secure Reset Token (15 min)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = hashToken(resetToken);
    const now = new Date();
    const resetTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    await prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: {
        verifiedAt: now,
        resetTokenHash,
        resetTokenExpiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      resetToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'OTP verification failed.' } },
      { status: 500 }
    );
  }
}
