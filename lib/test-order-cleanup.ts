import type { Prisma } from "@/generated/prisma/client";

export const MAX_TEST_ORDER_CLEANUP = 50;
const unpaidStatuses = new Set(["CREATED", "PENDING", "UNPAID"]);

export type TestOrderCleanupCandidate = {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  createdAt: Date;
  paymentStatus: string;
  orderStatus: string;
  paidAt: Date | null;
  gatewayPaymentId: string | null;
  gatewaySignature: string | null;
  invoiceNumber: string | null;
  shipmentStatus: string;
  courierPartner: string | null;
  trackingNumber: string | null;
  shipmentId: string | null;
  deliveredAt: Date | null;
  pickupAt: Date | null;
  shiprocketOrderId: string | null;
  shiprocketShipmentId: string | null;
  awbCode: string | null;
  pickupTokenNumber: string | null;
  pickupScheduledAt: Date | null;
  shipmentCreatedAt: Date | null;
  paymentVerification: { result: string } | null;
  _count: {
    refunds: number;
    shiprocketOperations: number;
    logisticsWebhookEvents: number;
    statusHistory: number;
    trackingEvents: number;
  };
};

export type TestOrderCleanupResult = {
  id: string;
  orderNumber: string;
  eligible: boolean;
  reasons: string[];
};

export function evaluateTestOrderCleanup(
  order: TestOrderCleanupCandidate,
): TestOrderCleanupResult {
  const reasons: string[] = [];
  if (!unpaidStatuses.has(order.paymentStatus.toUpperCase())) reasons.push(`Payment status is ${order.paymentStatus}, not pending/unpaid.`);
  if (order.orderStatus !== "PAYMENT_PENDING") reasons.push(`Order status is ${order.orderStatus}, not PAYMENT_PENDING.`);
  if (order.paidAt || order.gatewayPaymentId || order.gatewaySignature) reasons.push("A completed or signed gateway payment marker exists.");
  if (order.paymentVerification) reasons.push(`A payment verification record exists (${order.paymentVerification.result}).`);
  if (order._count.refunds > 0) reasons.push("A refund record exists.");
  if (order.invoiceNumber) reasons.push("An invoice has been finalized.");
  if (order.shipmentStatus !== "NOT_CREATED") reasons.push(`Shipment status is ${order.shipmentStatus}.`);
  if (order.courierPartner || order.trackingNumber || order.shipmentId || order.shiprocketOrderId || order.shiprocketShipmentId || order.awbCode || order.shipmentCreatedAt) reasons.push("Shipment, courier, tracking, Shiprocket, or AWB data exists.");
  if (order.pickupAt || order.pickupTokenNumber || order.pickupScheduledAt) reasons.push("Pickup data exists.");
  if (order.deliveredAt || order._count.statusHistory > 0 || order._count.trackingEvents > 0) reasons.push("Fulfilment, delivery, or tracking history exists.");
  if (order._count.shiprocketOperations > 0 || order._count.logisticsWebhookEvents > 0) reasons.push("Shiprocket operations or webhook events exist.");
  return { id: order.id, orderNumber: order.orderNumber, eligible: reasons.length === 0, reasons };
}

export const testOrderCleanupSelect = {
  id: true, orderNumber: true, customerEmail: true, createdAt: true, paymentStatus: true, orderStatus: true,
  paidAt: true, gatewayPaymentId: true, gatewaySignature: true, invoiceNumber: true, shipmentStatus: true,
  courierPartner: true, trackingNumber: true, shipmentId: true, deliveredAt: true, pickupAt: true,
  shiprocketOrderId: true, shiprocketShipmentId: true, awbCode: true, pickupTokenNumber: true,
  pickupScheduledAt: true, shipmentCreatedAt: true, paymentVerification: { select: { result: true } },
  _count: { select: { refunds: true, shiprocketOperations: true, logisticsWebhookEvents: true, statusHistory: true, trackingEvents: true } },
} satisfies Prisma.ShopOrderSelect;
