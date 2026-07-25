import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/schemes/user-auth';
import { sendOtpSms } from '@/lib/sms';
import crypto from 'crypto';

const SECRET_HASH_SALT = process.env.AUTH_SECRET || 'ratestack_otp_secret_salt_2026';

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(`${otp}:${SECRET_HASH_SALT}`).digest('hex');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawMobile = (body.mobileNumber || body.phone || body.identifier || '').trim();
    const normalizedMobile = normalizePhoneNumber(rawMobile);

    if (!normalizedMobile || normalizedMobile.length < 10) {
      return NextResponse.json(
        { success: false, error: { message: 'Enter a valid 10-digit mobile number.' } },
        { status: 400 }
      );
    }

    // Account Enumeration Protection: Always return generic message
    const genericResponse = {
      success: true,
      message: 'If an account exists, a verification code has been sent.',
    };

    // Check if active customer account exists
    const user = await prisma.schemeUser.findFirst({
      where: {
        phone: normalizedMobile,
        isActive: true,
      },
    });

    if (!user) {
      // Safe generic response without exposing non-existent status
      return NextResponse.json(genericResponse);
    }

    // Rate Limiting: Check maximum requests per mobile number in last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequestsCount = await prisma.passwordResetOtp.count({
      where: {
        mobileNumber: normalizedMobile,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentRequestsCount >= 5) {
      return NextResponse.json(
        { success: false, error: { message: 'Too many attempts. Please try again later.' } },
        { status: 429 }
      );
    }

    // Invalidate previous unconsumed OTPs for this mobile number
    await prisma.passwordResetOtp.updateMany({
      where: {
        mobileNumber: normalizedMobile,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const otpHash = hashOtp(rawOtp);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes validity
    const resendAvailableAt = new Date(now.getTime() + 45 * 1000); // 45 seconds resend cooldown

    // Save hashed OTP record to database
    await prisma.passwordResetOtp.create({
      data: {
        mobileNumber: normalizedMobile,
        otpHash,
        expiresAt,
        resendAvailableAt,
        attemptCount: 0,
      },
    });

    // Dispatch SMS via provider helper
    await sendOtpSms({
      mobileNumber: normalizedMobile,
      otp: rawOtp,
    });

    return NextResponse.json(genericResponse);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Unable to process OTP request.' } },
      { status: 500 }
    );
  }
}
