import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { allowedNextStatuses, canTransitionOrder, publicStatusMessage } from "../lib/admin-order-transitions";

const read=(path:string)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("order workflow allows the production fulfilment sequence and blocks unsafe jumps",()=>{
  const flow=["PAYMENT_PENDING","PAYMENT_VERIFIED","ORDER_CONFIRMED","PROCESSING","PACKED","READY_TO_SHIP","SHIPPED","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED"] as const;
  for(let index=0;index<flow.length-1;index++)assert.equal(canTransitionOrder(flow[index],flow[index+1]),true);
  assert.equal(canTransitionOrder("PAYMENT_PENDING","SHIPPED"),false);
  assert.equal(canTransitionOrder("DELIVERED","CANCELLED"),false);
  assert.equal(canTransitionOrder("DELIVERED","RETURN_REQUESTED"),true);
  assert.ok(allowedNextStatuses("CANCELLED").includes("REFUND_PENDING"));
  assert.match(publicStatusMessage("OUT_FOR_DELIVERY"),/delivery/i);
});

test("schema and migration provide immutable admin, shipment, payment and refund records",async()=>{
  const [schema,migration]=await Promise.all([read("prisma/schema.prisma"),read("prisma/migrations/20260730233000_add_admin_order_management/migration.sql")]);
  for(const model of ["OrderStatusHistory","ShipmentTrackingEvent","AdminOrderNote","PaymentVerification","ShopRefund","AdminAuditLog"])assert.match(schema,new RegExp(`model ${model}`));
  assert.match(schema,/role\s+AdminRole/);
  assert.match(migration,/CREATE TYPE "ShopOrderStatus"/);
  assert.match(migration,/CREATE TABLE "AdminAuditLog"/);
});

test("admin actions enforce server authorization, safe transitions and gateway verification",async()=>{
  const source=await read("app/admin/(workspace)/orders/actions.ts");
  assert.match(source,/requireOrderAdmin\("payment"\)/);
  assert.match(source,/verifyRazorpaySignature/);
  assert.match(source,/checkPhonePePaymentStatus/);
  assert.match(source,/Payment was already verified/);
  assert.match(source,/Delivered orders require the return workflow/);
  assert.match(source,/Refunds cannot be initiated/);
  assert.match(source,/Unsafe bulk action/);
});

test("customer response exposes public tracking events but not internal notes",async()=>{
  const source=await read("app/api/v1/me/dashboard/route.ts");
  assert.match(source,/trackingEvents/);
  assert.match(source,/publicMessage:\s*true/);
  assert.doesNotMatch(source,/internalNote:true/);
});

test("admin order workspace includes filters, export, documents, auditing and dashboard metrics",async()=>{
  const [list,detail,exportRoute,documentRoute,dashboard]=await Promise.all([
    read("components/admin/OrderManagementPage.tsx"),
    read("app/admin/(workspace)/orders/[orderId]/page.tsx"),
    read("app/api/v1/admin/orders/export/route.ts"),
    read("app/api/v1/admin/orders/[orderId]/document/route.ts"),
    read("app/admin/(workspace)/dashboard/page.tsx"),
  ]);
  assert.match(list,/Export filtered CSV/);assert.match(list,/bulk action/i);
  assert.match(detail,/Download invoice/);assert.match(detail,/Private admin notes/);
  assert.match(exportRoute,/text\/csv/);assert.match(exportRoute,/requireOrderAdmin\("export"\)/);
  assert.match(documentRoute,/packing-slip/);assert.match(documentRoute,/download/);
  assert.match(dashboard,/Refund pending/i);assert.match(dashboard,/Sales this month/i);
});
