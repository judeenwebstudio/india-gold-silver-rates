import type { Prisma, PrismaClient } from "@/generated/prisma/client";

// Notification delivery and deletion lock the same customer row. Never use a
// previously loaded device token without checking the current account state.
export async function withActiveCustomer<T>(db: Pick<PrismaClient, "$transaction">, customerId: string, action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T | null> {
  return db.$transaction(async tx => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "SchemeUser" WHERE "id" = ${customerId} AND "deletedAt" IS NULL AND "isActive" = true AND "accountStatus" = 'ACTIVE' FOR SHARE`;
    if (!rows.length) return null;
    return action(tx);
  }, { maxWait: 10_000, timeout: 60_000 });
}
