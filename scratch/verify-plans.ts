import 'dotenv/config';
import { prisma } from '../lib/prisma.js';

async function main() {
  const plans = await prisma.schemePlan.findMany({
    orderBy: [{ metalType: 'asc' }, { tenureMonths: 'asc' }],
    include: {
      _count: {
        select: { enrollments: true, coinDenominations: true },
      },
    },
  });

  console.log(`Total Public Plans in DB: ${plans.length}`);
  for (const p of plans) {
    console.log(
      `- ID: ${p.id} | Name: ${p.name} | Metal: ${p.metalType} (${p.purity}) | Tenure: ${p.tenureMonths}M | Enrollments: ${p._count.enrollments} | Denoms: ${p._count.coinDenominations}`
    );
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
