import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { evaluateTestOrderCleanup, type TestOrderCleanupCandidate } from "../lib/test-order-cleanup";

const cutoff = new Date("2026-07-31T06:30:00.000Z");
const candidate = (overrides: Partial<TestOrderCleanupCandidate> = {}): TestOrderCleanupCandidate => ({
  id: "cm1234567890123456789012", orderNumber: "SHOP-TEST-1", customerEmail: "test@example.com",
  createdAt: new Date("2026-07-30T00:00:00.000Z"), paymentStatus: "PENDING", orderStatus: "PAYMENT_PENDING",
  paidAt: null, gatewayPaymentId: null, gatewaySignature: null, invoiceNumber: null, shipmentStatus: "NOT_CREATED",
  courierPartner: null, trackingNumber: null, shipmentId: null, deliveredAt: null, pickupAt: null,
  shiprocketOrderId: null, shiprocketShipmentId: null, awbCode: null, pickupTokenNumber: null,
  pickupScheduledAt: null, shipmentCreatedAt: null, paymentVerification: null,
  _count: { refunds: 0, shiprocketOperations: 0, logisticsWebhookEvents: 0, statusHistory: 0, trackingEvents: 0 },
  ...overrides,
});

test("unpaid pending test order before cutoff is eligible", () => {
  assert.equal(evaluateTestOrderCleanup(candidate(), cutoff).eligible, true);
});

test("paid or successful gateway order is blocked", () => {
  const result = evaluateTestOrderCleanup(candidate({ paymentStatus: "SUCCESS", paidAt: new Date() }), cutoff);
  assert.equal(result.eligible, false); assert.match(result.reasons.join(" "), /Payment status|gateway payment marker/);
});

test("any payment verification record is blocked", () => {
  assert.equal(evaluateTestOrderCleanup(candidate({ paymentVerification: { result: "VERIFIED" } }), cutoff).eligible, false);
});

test("shipped or fulfilled order is blocked", () => {
  const result = evaluateTestOrderCleanup(candidate({ orderStatus: "SHIPPED", shipmentStatus: "SHIPPED", trackingNumber: "AWB1" }), cutoff);
  assert.equal(result.eligible, false); assert.match(result.reasons.join(" "), /Order status|Shipment status|tracking/);
});

test("refund order is blocked", () => {
  assert.equal(evaluateTestOrderCleanup(candidate({ _count: { ...candidate()._count, refunds: 1 } }), cutoff).eligible, false);
});

test("new orders and non-allowlisted customer orders are blocked", () => {
  assert.equal(evaluateTestOrderCleanup(candidate({ createdAt: cutoff }), cutoff).eligible, false);
  assert.equal(evaluateTestOrderCleanup(candidate(), cutoff, new Set(["another@example.com"])).eligible, false);
});

test("cleanup action is super-admin only and inherits authentication and CSRF", async () => {
  const [action, permissions, guard] = await Promise.all([
    readFile(new URL("../app/admin/(workspace)/orders/cleanup-actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-permissions.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/admin-orders.ts", import.meta.url), "utf8"),
  ]);
  assert.match(action, /requireOrderAdmin\("cleanup"\)/);
  assert.match(action, /admin\.role !== "SUPER_ADMIN"/);
  assert.match(permissions, /cleanup:\["SUPER_ADMIN"\]/);
  assert.match(guard, /ADMIN_UNAUTHORIZED/); assert.match(guard, /CSRF_REJECTED/);
  assert.doesNotMatch(action, /export const initialCleanupState/);
  assert.match(action, /export async function testOrderCleanupAction/);
});

test("cleanup fails closed and transaction rollback protects the batch", async () => {
  const action = await readFile(new URL("../app/admin/(workspace)/orders/cleanup-actions.ts", import.meta.url), "utf8");
  assert.match(action, /if \(blocked\.length\).*Nothing was deleted/s);
  assert.match(action, /prisma\.\$transaction\(async tx =>/);
  assert.match(action, /CLEANUP_ELIGIBILITY_CHANGED/);
  assert.match(action, /deleted\.count !== ids\.length/);
});

test("successful transaction records an immutable admin audit", async () => {
  const action = await readFile(new URL("../app/admin/(workspace)/orders/cleanup-actions.ts", import.meta.url), "utf8");
  assert.match(action, /tx\.adminAuditLog\.create/);
  assert.match(action, /TEST_ORDERS_DELETED/);
  assert.match(action, /orderIds: ids/);
});

test("orders page keeps existing controls and a valid client/server boundary", async () => {
  const [client, page, actions, shipping] = await Promise.all([
    readFile(new URL("../components/admin/TestOrderCleanupPanel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/admin/OrderManagementPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/(workspace)/orders/actions.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/(workspace)/orders/shiprocket-actions.ts", import.meta.url), "utf8"),
  ]);
  assert.match(client, /const initialCleanupState: CleanupActionState/);
  assert.doesNotMatch(client, /import \{ initialCleanupState/);
  assert.match(page, /TestOrderCleanupPanel/); assert.match(page, /admin\.role==="SUPER_ADMIN"/);
  assert.match(page, /Apply filters/); assert.match(page, /pageHref/); assert.match(page, /bulkOrderAction/);
  assert.match(actions, /verifyPaymentAction/); assert.match(actions, /updateShipmentAction/);
  assert.match(shipping, /createShiprocketAction/); assert.match(shipping, /assignAwbAction/); assert.match(shipping, /schedulePickupAction/);
});
