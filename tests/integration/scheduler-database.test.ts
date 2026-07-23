import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../lib/prisma";
import {
  acquireRateSyncLease,
  releaseRateSyncLease,
  type RateSyncLease,
} from "../../lib/scheduler/lock";

test("PostgreSQL execution lease prevents overlap and releases cleanly", async () => {
  let firstLease: RateSyncLease | null = null;
  let reacquiredLease: RateSyncLease | null = null;

  try {
    firstLease = await acquireRateSyncLease(30_000);
    assert.ok(firstLease, "Expected the scheduler lock to be available.");

    const overlappingLease = await acquireRateSyncLease(30_000);
    assert.equal(overlappingLease, null);

    await releaseRateSyncLease(firstLease);
    firstLease = null;

    reacquiredLease = await acquireRateSyncLease(30_000);
    assert.ok(reacquiredLease, "Expected the released scheduler lock to be reusable.");
  } finally {
    if (firstLease) await releaseRateSyncLease(firstLease);
    if (reacquiredLease) await releaseRateSyncLease(reacquiredLease);
    await prisma.$disconnect();
  }
});
