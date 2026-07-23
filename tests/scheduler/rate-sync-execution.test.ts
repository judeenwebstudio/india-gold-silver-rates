import assert from "node:assert/strict";
import test from "node:test";

import {
  RetryExecutionError,
  runLockedRetryPipeline,
} from "../../lib/scheduler/execution";
import { rateValuesAreEqual } from "../../lib/scheduler/rate-values";

type Lease = { owner: string };

function availableLeaseManager() {
  let released = 0;
  return {
    manager: {
      acquire: async (): Promise<Lease> => ({ owner: "test-owner" }),
      release: async () => {
        released += 1;
      },
    },
    released: () => released,
  };
}

test("successful synchronization commits validated values once", async () => {
  const lease = availableLeaseManager();
  let commits = 0;
  const result = await runLockedRetryPipeline({
    leaseManager: lease.manager,
    prepare: async () => ({ sourceDate: "2026-07-23", value: 100 }),
    commit: async (prepared) => {
      commits += 1;
      return { outcome: "SUCCESS", changedRates: prepared.value === 100 ? 1 : 0 };
    },
    maxAttempts: 3,
    isRetryable: () => true,
    wait: async () => undefined,
  });

  assert.deepEqual(result, {
    acquired: true,
    result: { outcome: "SUCCESS", changedRates: 1 },
    attempts: 1,
  });
  assert.equal(commits, 1);
  assert.equal(lease.released(), 1);
});

test("no-change synchronization completes without creating changes", async () => {
  const lease = availableLeaseManager();
  const result = await runLockedRetryPipeline({
    leaseManager: lease.manager,
    prepare: async () => ({ value: "100.0000" }),
    commit: async () => ({ outcome: "NO_CHANGE", changedRates: 0 }),
    maxAttempts: 3,
    isRetryable: () => true,
    wait: async () => undefined,
  });

  assert.equal(result.acquired, true);
  if (result.acquired) {
    assert.equal(result.result.outcome, "NO_CHANGE");
    assert.equal(result.result.changedRates, 0);
  }
});

test("repeated source value is idempotent even when the source timestamp changes", () => {
  assert.equal(
    rateValuesAreEqual(
      { pricePerGram: "7421.5000", pricePerKilogram: null },
      { pricePerGram: "7421.5", pricePerKilogram: null },
    ),
    true,
  );
  assert.equal(
    rateValuesAreEqual(
      { pricePerGram: "95.2500", pricePerKilogram: "95250.00" },
      { pricePerGram: "95.25", pricePerKilogram: 95250 },
    ),
    true,
  );
});

test("duplicate run is prevented when the execution lease is unavailable", async () => {
  let prepares = 0;
  let commits = 0;
  const result = await runLockedRetryPipeline({
    leaseManager: {
      acquire: async () => null,
      release: async () => undefined,
    },
    prepare: async () => {
      prepares += 1;
      return {};
    },
    commit: async () => {
      commits += 1;
      return {};
    },
    maxAttempts: 3,
    isRetryable: () => true,
  });

  assert.deepEqual(result, { acquired: false });
  assert.equal(prepares, 0);
  assert.equal(commits, 0);
});

test("concurrent run cannot acquire a lease held by another run", async () => {
  let held = false;
  let allowFirstRunToFinish: (() => void) | undefined;
  const firstRunCanFinish = new Promise<void>((resolve) => {
    allowFirstRunToFinish = resolve;
  });
  const manager = {
    acquire: async (): Promise<Lease | null> => {
      if (held) return null;
      held = true;
      return { owner: "shared-owner" };
    },
    release: async () => {
      held = false;
    },
  };

  const first = runLockedRetryPipeline({
    leaseManager: manager,
    prepare: async () => {
      await firstRunCanFinish;
      return "ready";
    },
    commit: async () => "done",
    maxAttempts: 1,
    isRetryable: () => false,
  });

  await Promise.resolve();
  const concurrent = await runLockedRetryPipeline({
    leaseManager: manager,
    prepare: async () => "should-not-run",
    commit: async () => "should-not-commit",
    maxAttempts: 1,
    isRetryable: () => false,
  });

  assert.deepEqual(concurrent, { acquired: false });
  allowFirstRunToFinish?.();
  assert.equal((await first).acquired, true);
});

test("validation rejection is not retried", async () => {
  const lease = availableLeaseManager();
  let attempts = 0;
  const rejection = new Error("Rejected malformed values");

  await assert.rejects(
    () =>
      runLockedRetryPipeline({
        leaseManager: lease.manager,
        prepare: async () => {
          attempts += 1;
          throw rejection;
        },
        commit: async () => "never",
        maxAttempts: 3,
        isRetryable: () => false,
        wait: async () => undefined,
      }),
    (error) =>
      error instanceof RetryExecutionError &&
      error.attempts === 1 &&
      error.originalError === rejection,
  );
  assert.equal(attempts, 1);
});

test("transient scraper failure is retried and then synchronized", async () => {
  const lease = availableLeaseManager();
  let attempts = 0;
  const result = await runLockedRetryPipeline({
    leaseManager: lease.manager,
    prepare: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("Temporary source failure");
      return { value: 7421.5 };
    },
    commit: async (prepared) => ({
      outcome: "SUCCESS",
      changedRates: prepared.value > 0 ? 1 : 0,
    }),
    maxAttempts: 3,
    isRetryable: () => true,
    wait: async () => undefined,
  });

  assert.equal(attempts, 2);
  assert.equal(result.acquired, true);
  if (result.acquired) {
    assert.equal(result.attempts, 2);
    assert.equal(result.result.outcome, "SUCCESS");
  }
});

test("retry exhaustion stops after three attempts with exponential backoff", async () => {
  const lease = availableLeaseManager();
  const delays: number[] = [];
  let attempts = 0;

  await assert.rejects(
    () =>
      runLockedRetryPipeline({
        leaseManager: lease.manager,
        prepare: async () => {
          attempts += 1;
          throw new Error("Source unavailable");
        },
        commit: async () => "never",
        maxAttempts: 3,
        isRetryable: () => true,
        wait: async (delayMs) => {
          delays.push(delayMs);
        },
      }),
    (error) => error instanceof RetryExecutionError && error.attempts === 3,
  );

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [500, 1000]);
});

test("previous valid rates remain untouched after scraper failure", async () => {
  const lease = availableLeaseManager();
  const previousRates = [{ purity: "24K", value: 7421.5 }];
  const snapshot = structuredClone(previousRates);
  let commits = 0;

  await assert.rejects(() =>
    runLockedRetryPipeline({
      leaseManager: lease.manager,
      prepare: async () => {
        throw new Error("Source timed out");
      },
      commit: async () => {
        commits += 1;
        previousRates[0]!.value = 0;
        return "unexpected";
      },
      maxAttempts: 3,
      isRetryable: () => true,
      wait: async () => undefined,
    }),
  );

  assert.equal(commits, 0);
  assert.deepEqual(previousRates, snapshot);
});
