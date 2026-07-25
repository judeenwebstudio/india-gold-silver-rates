import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { enforceMerchantGuardForLivePayments } from '@/lib/schemes/merchant-guard';
import { inrToPaise, paiseToInrNumber, calculateMetalValuePaise } from '@/lib/schemes/precision';
import { z } from 'zod';

const joinSchema = z.object({
  monthlyAmount: z.number().min(200, 'Monthly amount must be at least ₹200'),
  nomineeFullName: z.string().min(2, 'Nominee full name is required'),
  nomineeRelationship: z.string().min(1, 'Nominee relationship is required'),
  nomineePhone: z.string().optional(),
  nomineeAge: z.number().optional(),
  acceptedTermsVersion: z.string().min(1, 'Terms acceptance is required'),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await context.params;

    // 1. Auth check
    const authUser = await authenticateSchemeUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required to join scheme' } },
        { status: 401 }
      );
    }

    // 2. Merchant guard check
    await enforceMerchantGuardForLivePayments();

    const body = await request.json();
    const parsed = joinSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { message: parsed.error.issues[0].message } },
        { status: 400 }
      );
    }

    const {
      monthlyAmount,
      nomineeFullName,
      nomineeRelationship,
      nomineePhone,
      nomineeAge,
      acceptedTermsVersion,
    } = parsed.data;

    // 3. Fetch Plan
    const plan = await prisma.schemePlan.findUnique({
      where: { id: planId },
      include: {
        coinDenominations: { where: { inStock: true }, orderBy: { weightMilligrams: 'asc' } },
      },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { success: false, error: { message: 'Selected scheme plan is not active or available' } },
        { status: 404 }
      );
    }

    const monthlyPaise = inrToPaise(monthlyAmount);
    if (monthlyPaise < plan.minMonthlyAmountPaise || monthlyPaise > plan.maxMonthlyAmountPaise) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `Monthly amount must be between ${paiseToInrNumber(plan.minMonthlyAmountPaise)} and ${paiseToInrNumber(plan.maxMonthlyAmountPaise)}`,
          },
        },
        { status: 400 }
      );
    }

    const totalScheduledPaise = monthlyPaise * BigInt(plan.tenureMonths);

    // 4. Generate unique account number: RS-SCH-YYYY-XXXXX
    const year = new Date().getFullYear();
    const count = await prisma.schemeEnrollment.count();
    const accountNumber = `RS-SCH-${year}-${(count + 1).toString().padStart(5, '0')}`;

    const startDate = new Date();
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + plan.tenureMonths);

    // 5. Create Enrollment, Nominee, and Installment Schedule in Transaction
    const enrollment = await prisma.$transaction(async (tx) => {
      const created = await tx.schemeEnrollment.create({
        data: {
          accountNumber,
          userId: authUser.userId,
          planId: plan.id,
          metalType: plan.metalType,
          purity: plan.purity,
          tenureMonths: plan.tenureMonths,
          monthlyAmountPaise: monthlyPaise,
          totalScheduledAmountPaise: totalScheduledPaise,
          eligiblePurchaseBalancePaise: 0n,
          paidInstallmentCount: 0,
          remainingInstallmentCount: plan.tenureMonths,
          startDate,
          maturityDate,
          nextDueDate: startDate, // First installment due immediately on start
          overdueAmountPaise: 0n,
          status: 'ACTIVE',
          termsVersion: acceptedTermsVersion,
          acceptedTermsAt: new Date(),
          nominee: {
            create: {
              fullName: nomineeFullName,
              relationship: nomineeRelationship,
              phone: nomineePhone || null,
              age: nomineeAge || null,
            },
          },
        },
      });

      // Generate Installment Schedule
      const scheduleData = [];
      for (let i = 1; i <= plan.tenureMonths; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1));
        scheduleData.push({
          enrollmentId: created.id,
          installmentNo: i,
          dueDate,
          amountPaise: monthlyPaise,
          status: 'PENDING' as const,
        });
      }

      await tx.installmentSchedule.createMany({
        data: scheduleData,
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      data: {
        enrollmentId: enrollment.id,
        accountNumber: enrollment.accountNumber,
        productName: plan.name,
        monthlyAmount: paiseToInrNumber(enrollment.monthlyAmountPaise),
        totalScheduledAmount: paiseToInrNumber(enrollment.totalScheduledAmountPaise),
        tenureMonths: enrollment.tenureMonths,
        startDate: enrollment.startDate,
        maturityDate: enrollment.maturityDate,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to join scheme' } },
      { status: 500 }
    );
  }
}
