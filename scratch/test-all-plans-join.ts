import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('--- Testing Plan Join & Installment Generation for All 6 Plans ---');

  let user = await prisma.schemeUser.findFirst({
    where: { phone: '9176585663' },
  });

  if (!user) {
    console.log('Test user not found');
    return;
  }

  const planIds = [
    { id: 'plan-gold-22k-12m', expectedMonths: 12, amount: 1000 },
    { id: 'plan-gold-22k-24m', expectedMonths: 24, amount: 1000 },
    { id: 'plan-gold-22k-36m', expectedMonths: 36, amount: 1000 },
    { id: 'plan-silver-999-12m', expectedMonths: 12, amount: 500 },
    { id: 'plan-silver-999-24m', expectedMonths: 24, amount: 500 },
    { id: 'plan-silver-999-36m', expectedMonths: 36, amount: 500 },
  ];

  for (const item of planIds) {
    const plan = await prisma.schemePlan.findUnique({ where: { id: item.id } });
    if (!plan) {
      console.error(`Plan ${item.id} not found in DB!`);
      continue;
    }

    const year = new Date().getFullYear();
    const count = await prisma.schemeEnrollment.count();
    const accountNumber = `RS-TEST-${year}-${(count + 1).toString().padStart(5, '0')}`;
    const monthlyPaise = BigInt(item.amount * 100);
    const totalScheduledPaise = monthlyPaise * BigInt(plan.tenureMonths);

    const startDate = new Date();
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + plan.tenureMonths);

    const enrollment = await prisma.$transaction(async (tx) => {
      const created = await tx.schemeEnrollment.create({
        data: {
          accountNumber,
          userId: user.id,
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
          nextDueDate: startDate,
          overdueAmountPaise: 0n,
          status: 'ACTIVE',
          termsVersion: 'v1.0-2026',
          acceptedTermsAt: new Date(),
          nominee: {
            create: {
              fullName: 'Test Nominee',
              relationship: 'Spouse',
            },
          },
        },
      });

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

    const instCount = await prisma.installmentSchedule.count({
      where: { enrollmentId: enrollment.id },
    });

    const totalScheduledInr = Number(enrollment.totalScheduledAmountPaise) / 100;
    console.log(
      `✓ Plan: ${plan.id} | Acc: ${enrollment.accountNumber} | Monthly: ₹${item.amount} | Tenure: ${enrollment.tenureMonths}M | TotalScheduled: ₹${totalScheduledInr} | Installments Created: ${instCount} / ${item.expectedMonths}`
    );
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
