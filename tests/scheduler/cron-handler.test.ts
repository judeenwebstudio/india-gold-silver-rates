import assert from "node:assert/strict";
import test from "node:test";

import { handleRateSyncCron } from "../../lib/scheduler/cron-handler";

const SECRET = "test-only-cron-secret-with-sufficient-length";

test("valid cron secret authorizes a successful synchronization", async () => {
  let executions = 0;
  const response = await handleRateSyncCron(
    new Request("http://localhost/api/cron/rate-sync", {
      headers: { Authorization: `Bearer ${SECRET}` },
    }),
    {
      secret: SECRET,
      execute: async () => {
        executions += 1;
        return {
          ok: true,
          outcome: "SUCCESS",
          message: "Synchronized.",
          database: {
            created: 1,
            updated: 2,
            unchanged: 2,
            historyEntries: 3,
          },
        };
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(executions, 1);
  assert.deepEqual(await response.json(), {
    ok: true,
    outcome: "SUCCESS",
    message: "Synchronized.",
    changedRates: 3,
  });
});

test("invalid cron secret returns 401 without executing synchronization", async () => {
  let executions = 0;
  const response = await handleRateSyncCron(
    new Request("http://localhost/api/cron/rate-sync", {
      headers: { Authorization: "Bearer incorrect-secret" },
    }),
    {
      secret: SECRET,
      execute: async () => {
        executions += 1;
        return { ok: true, outcome: "SUCCESS", message: "Unexpected." };
      },
    },
  );

  assert.equal(response.status, 401);
  assert.equal(executions, 0);
});

test("missing authorization returns 401 without executing synchronization", async () => {
  const response = await handleRateSyncCron(
    new Request("http://localhost/api/cron/rate-sync"),
    {
      secret: SECRET,
      execute: async () => ({
        ok: true,
        outcome: "SUCCESS",
        message: "Unexpected.",
      }),
    },
  );

  assert.equal(response.status, 401);
});

test("missing configured cron secret fails closed with HTTP 401", async () => {
  const response = await handleRateSyncCron(
    new Request("http://localhost/api/cron/rate-sync", {
      headers: { Authorization: `Bearer ${SECRET}` },
    }),
    {
      secret: undefined,
      execute: async () => ({
        ok: true,
        outcome: "SUCCESS",
        message: "Unexpected.",
      }),
    },
  );

  assert.equal(response.status, 401);
});
