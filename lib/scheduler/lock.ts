import { randomUUID } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const RATE_SYNC_LOCK_KEY = "national-rate-sync";
export const RATE_SYNC_LOCK_TTL_MS = 5 * 60 * 1_000;

export type RateSyncLease = {
  key: string;
  ownerToken: string;
  acquiredAt: Date;
  lockedUntil: Date;
};

export async function acquireRateSyncLease(
  ttlMs = RATE_SYNC_LOCK_TTL_MS,
): Promise<RateSyncLease | null> {
  const acquiredAt = new Date();
  const lockedUntil = new Date(acquiredAt.getTime() + ttlMs);
  const ownerToken = randomUUID();

  const rows = await prisma.$queryRaw<RateSyncLease[]>(Prisma.sql`
    INSERT INTO "RateSyncLock"
      ("key", "ownerToken", "acquiredAt", "lockedUntil", "updatedAt")
    VALUES
      (${RATE_SYNC_LOCK_KEY}, ${ownerToken}, ${acquiredAt}, ${lockedUntil}, ${acquiredAt})
    ON CONFLICT ("key") DO UPDATE
    SET
      "ownerToken" = EXCLUDED."ownerToken",
      "acquiredAt" = EXCLUDED."acquiredAt",
      "lockedUntil" = EXCLUDED."lockedUntil",
      "updatedAt" = EXCLUDED."updatedAt"
    WHERE "RateSyncLock"."lockedUntil" <= ${acquiredAt}
    RETURNING "key", "ownerToken", "acquiredAt", "lockedUntil"
  `);

  return rows[0] ?? null;
}

export async function releaseRateSyncLease(lease: RateSyncLease) {
  await prisma.rateSyncLock.deleteMany({
    where: {
      key: lease.key,
      ownerToken: lease.ownerToken,
    },
  });
}
