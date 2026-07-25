import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/schemes/user-auth';
import crypto from 'crypto';

const SECRET_HASH_SALT = process.env.AUTH_SECRET || 'ratestack_otp_secret_salt_2026';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(`${token}:${SECRET_HASH_SALT}`).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resetToken = (body.resetToken || '').trim();
    const newPassword = (body.newPassword || '').trim();

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid or expired reset token. Please restart the password reset process.' } },
        { status: 400 }
      );
    }

    // Password validation rules
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: { message: 'Use at least 8 characters with a letter and a number.' } },
        { status: 400 }
      );
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasLetter || !hasNumber) {
      return NextResponse.json(
        { success: false, error: { message: 'Use at least 8 characters with a letter and a number.' } },
        { status: 400 }
      );
    }

    // Find OTP record associated with reset token
    const tokenHash = hashToken(resetToken);
    const otpRecord = await prisma.passwordResetOtp.findUnique({
      where: { resetTokenHash: tokenHash },
    });

    if (!otpRecord || otpRecord.consumedAt) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid or expired reset token. Please restart the password reset process.' } },
        { status: 400 }
      );
    }

    if (!otpRecord.resetTokenExpiresAt || new Date() > otpRecord.resetTokenExpiresAt) {
      return NextResponse.json(
        { success: false, error: { message: 'The reset token has expired. Please restart the password reset process.' } },
        { status: 400 }
      );
    }

    // Ensure password is not equal to mobile number
    if (newPassword === otpRecord.mobileNumber) {
      return NextResponse.json(
        { success: false, error: { message: 'Password cannot be the same as your mobile number.' } },
        { status: 400 }
      );
    }

    // Find target customer
    const user = await prisma.schemeUser.findFirst({
      where: {
        phone: otpRecord.mobileNumber,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'Account not found. Please register.' } },
        { status: 404 }
      );
    }

    // Hash new password using project standard bcrypt method
    const passwordHash = await hashPassword(newPassword);

    // Update customer password and consume reset token
    await prisma.$transaction([
      prisma.schemeUser.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Password reset failed.' } },
      { status: 500 }
    );
  }
}
