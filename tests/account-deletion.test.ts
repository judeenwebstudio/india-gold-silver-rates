import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { acceptsDeletionOrigin, deletionRequestSchema, readDeletionRequest } from "../lib/account-deletion";
import { storeDeletionRequest } from "../lib/account-deletion-intake";

test("normalizes registered email and Indian mobile identifiers without collecting other data", () => {
  for (const [input, expected] of [[" Alice@Example.com ", "alice@example.com"], ["+91 98765-43210", "9876543210"], ["9876543210", "9876543210"]]) {
    assert.equal(deletionRequestSchema.parse({ identifier: input }).identifier, expected);
  }
  for (const identifier of ["", "a@", "123", "9876543210<script>", "a".repeat(255), "alice@example.com\r\nBcc: bad@example.com"]) {
    assert.equal(deletionRequestSchema.safeParse({ identifier }).success, false);
  }
  assert.equal(deletionRequestSchema.safeParse({ identifier: "a@example.com", password: "secret" }).success, false);
});

test("only same-origin browser requests are accepted", () => {
  const request = (origin?: string) => new Request("https://ratestack.in/api/account-deletion", { headers: origin ? { origin } : {} });
  assert.equal(acceptsDeletionOrigin(request("https://ratestack.in")), true);
  for (const origin of [undefined, "null", "https://evil.example", "http://ratestack.in", "https://ratestack.in.evil.example"]) {
    assert.equal(acceptsDeletionOrigin(request(origin)), false);
  }
});

test("body parsing rejects malformed, wrong-type and oversized actual payloads", async () => {
  const request = (body: string, type = "application/json") => new Request("https://ratestack.in/api/account-deletion", { method: "POST", headers: { "content-type": type, "content-length": "1" }, body });
  assert.deepEqual(await readDeletionRequest(request('{"identifier":"a@example.com"}')), { identifier: "a@example.com" });
  await assert.rejects(readDeletionRequest(request("{")));
  await assert.rejects(readDeletionRequest(request("{}", "text/plain")));
  await assert.rejects(readDeletionRequest(request(JSON.stringify({ identifier: "a".repeat(2048) }))));
});

function fakeTransaction({ count = 0, ipCount = 0, duplicate = false } = {}) {
  const operations: string[] = [];
  const tx = {
    $executeRaw: async () => { operations.push("lock"); },
    accountDeletionRequest: {
      deleteMany: async (args: unknown) => { operations.push("cleanup"); assert.match(JSON.stringify(args), /PENDING/); },
      count: async (args: { where: { ipHash?: string } }) => args.where.ipHash ? ipCount : count,
      findFirst: async () => duplicate ? { id: "existing" } : null,
      create: async () => { operations.push("create"); },
    },
  } as unknown as Parameters<typeof storeDeletionRequest>[0];
  return { tx, operations };
}
const input = { identifier: "a@example.com", contactHash: "contact-hash", ipHash: "ip-hash" };

test("intake stores only a request after locking; duplicate submissions are idempotent", async () => {
  const first = fakeTransaction();
  assert.equal(await storeDeletionRequest(first.tx, input), "ACCEPTED");
  assert.deepEqual(first.operations, ["lock", "cleanup", "create"]);
  const duplicate = fakeTransaction({ duplicate: true });
  assert.equal(await storeDeletionRequest(duplicate.tx, input), "ACCEPTED");
  assert.deepEqual(duplicate.operations, ["lock", "cleanup"]);
});

test("per-IP and global admission caps cannot create another request", async () => {
  for (const limits of [{ ipCount: 5 }, { count: 100 }, { count: 101, ipCount: 0 }]) {
    const { tx, operations } = fakeTransaction(limits);
    assert.equal(await storeDeletionRequest(tx, input), "LIMITED");
    assert.equal(operations.includes("create"), false);
  }
  assert.equal(await storeDeletionRequest(fakeTransaction({ count: 99, ipCount: 4 }).tx, input), "ACCEPTED");
});

test("storage failures propagate instead of claiming successful delivery", async () => {
  const { tx } = fakeTransaction();
  tx.$executeRaw = (() => Promise.reject(new Error("database unavailable"))) as typeof tx.$executeRaw;
  await assert.rejects(storeDeletionRequest(tx, input), /database unavailable/);
});

test("public page and review queue keep deletion behind manual ownership confirmation", () => {
  const read = (path: string) => readFileSync(path, "utf8");
  const page = read("app/(public)/account-deletion/page.tsx");
  assert.match(page, /Delete Your RateStack Account/);
  assert.match(page, /without requiring login/);
  assert.match(page, /invoice, receipt, payment, refund/);
  const route = read("app/api/account-deletion/route.ts");
  assert.doesNotMatch(route, /schemeUser\.|deleteMany|sendTransactionalEmail/);
  assert.match(route, /503/);
  assert.match(route, /429/);
  const actions = read("app/admin/(workspace)/account-deletion/actions.ts");
  assert.match(actions, /requireCustomerAdmin\("CUSTOMER_DATA_FULL"\)/);
  assert.match(actions, /form.get\("confirmed"\) === "yes"/);
  assert.match(actions, /adminAuditLog.create/);
  assert.doesNotMatch(actions, /schemeUser\./);
  assert.match(read("components/customer/CustomerDashboard.tsx"), /href="\/account-deletion"/);
});
