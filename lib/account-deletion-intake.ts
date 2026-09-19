import type { Prisma } from "@/generated/prisma/client";

type IntakeTransaction = Pick<Prisma.TransactionClient, "$executeRaw" | "accountDeletionRequest">;

export async function storeDeletionRequest(tx: IntakeTransaction, input: { identifier: string; contactHash: string; ipHash: string }, now = new Date()) {
  // Shared lock prevents concurrent requests bypassing limits across replicas.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(724619032)`;
  await tx.accountDeletionRequest.deleteMany({ where: { status: "PENDING", createdAt: { lt: new Date(now.getTime() - 30 * 86400_000) } } });
  const hour = new Date(now.getTime() - 3600_000);
  const count = await tx.accountDeletionRequest.count({ where: { createdAt: { gte: hour } } });
  const ipCount = await tx.accountDeletionRequest.count({ where: { ipHash: input.ipHash, createdAt: { gte: hour } } });
  if (count >= 100 || ipCount >= 5) return "LIMITED";
  const duplicate = await tx.accountDeletionRequest.findFirst({ where: { contactHash: input.contactHash, status: { in: ["PENDING", "VERIFIED"] } } });
  if (!duplicate) await tx.accountDeletionRequest.create({ data: input });
  return "ACCEPTED";
}
