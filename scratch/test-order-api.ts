import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

async function main() {
  console.log('--- Inspecting Customer & Enrollments ---');
  const user = await prisma.schemeUser.findFirst({
    where: { phone: '9176585663' },
    include: {
      enrollments: {
        include: {
          installments: true,
        },
      },
    },
  });

  if (!user) {
    console.log('User 9176585663 not found');
    return;
  }

  console.log(`User ID: ${user.id}, FullName: ${user.fullName}, Phone: ${user.phone}`);
  console.log(`Total Enrollments: ${user.enrollments.length}`);
  for (const enc of user.enrollments) {
    console.log(`Enrollment ID: ${enc.id}, AccNo: ${enc.accountNumber}, Status: ${enc.status}, MonthlyAmt: ₹${enc.monthlyAmountPaise / 100n}, PaidCount: ${enc.paidInstallmentCount}/${enc.tenureMonths}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
