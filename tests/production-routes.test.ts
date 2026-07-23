import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { after, before, test } from "node:test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const CRON_SECRET = randomBytes(32).toString("hex");
let server: ChildProcess;
let serverOutput = "";

async function waitUntilReady() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Production server exited before becoming ready. ${serverOutput}`);
    }

    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Production server did not become ready. ${serverOutput}`);
}

before(async () => {
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CRON_SECRET,
        AUTH_URL: "not-a-valid-auth-url",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    },
  );
  server.stdout?.on("data", (chunk: Buffer) => {
    serverOutput += chunk.toString("utf8");
  });
  server.stderr?.on("data", (chunk: Buffer) => {
    serverOutput += chunk.toString("utf8");
  });
  await waitUntilReady();
});

after(() => {
  if (server && server.exitCode === null) {
    server.kill();
  }
});

test("production homepage regression", async () => {
  const response = await fetch(`${BASE_URL}/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(html, /India Gold &amp; Silver Rates/);
  assert.match(html, /Indicative city rates/);
  assert.match(html, /Gold price calculator/);
  assert.match(html, /Rates in major cities/);
  assert.match(html, /Know your gold hallmark/);
});

test("Auth.js session route tolerates an invalid optional URL override", async () => {
  const response = await fetch(`${BASE_URL}/api/auth/session`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), null);
});

async function assertRedirectsToAdminLogin(pathname: string) {
  const response = await fetch(`${BASE_URL}${pathname}`, { redirect: "manual" });
  const location = response.headers.get("location");

  assert.ok([302, 303, 307, 308].includes(response.status));
  assert.ok(location);
  assert.equal(new URL(location, BASE_URL).pathname, "/admin/login");
}

test("admin root redirects unauthenticated requests to the existing login", async () => {
  await assertRedirectsToAdminLogin("/admin");
});

test("admin login route renders successfully", async () => {
  const response = await fetch(`${BASE_URL}/admin/login`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  assert.match(html, /Welcome back/);
});

test("admin dashboard remains protected by the existing login route", async () => {
  await assertRedirectsToAdminLogin("/admin/dashboard");
});

test("admin Analytics page remains protected by the existing login route", async () => {
  await assertRedirectsToAdminLogin("/admin/analytics");
});

test("admin AdSense page remains protected by the existing login route", async () => {
  await assertRedirectsToAdminLogin("/admin/adsense");
});

test("admin API Logs page remains protected by the existing login route", async () => {
  await assertRedirectsToAdminLogin("/admin/api-logs");
});

test("analytics ingestion rejects requests without a same-origin header", async () => {
  const response = await fetch(`${BASE_URL}/api/analytics/track`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 403);
});

test("production cron route rejects missing authorization", async () => {
  const response = await fetch(`${BASE_URL}/api/cron/rate-sync`);
  assert.equal(response.status, 401);
});

test("production cron route rejects an invalid bearer secret", async () => {
  const response = await fetch(`${BASE_URL}/api/cron/rate-sync`, {
    headers: { Authorization: "Bearer invalid-production-test-secret" },
  });
  assert.equal(response.status, 401);
});

test(
  "authorized production cron route handles the live source safely",
  { skip: process.env.LIVE_CRON_SMOKE !== "1" },
  async () => {
    const response = await fetch(`${BASE_URL}/api/cron/rate-sync`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const body = (await response.json()) as {
      ok?: boolean;
      outcome?: string;
      changedRates?: number;
    };

    assert.ok([200, 422].includes(response.status));
    assert.match(body.outcome ?? "", /^(SUCCESS|NO_CHANGE|REJECTED)$/);
    assert.ok((body.changedRates ?? -1) >= 0);

    if (response.status === 422) {
      assert.equal(body.ok, false);
      assert.equal(body.outcome, "REJECTED");
      assert.equal(body.changedRates, 0);
    } else {
      assert.equal(body.ok, true);
    }
  },
);
