import 'dotenv/config';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/schemes/user-auth.js';

async function main() {
  const hash = await hashPassword('Password123!');
  const updated = await prisma.schemeUser.updateMany({
    where: { phone: '9176585663' },
    data: { passwordHash: hash },
  });
  console.log('Password updated for test user count:', updated.count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
