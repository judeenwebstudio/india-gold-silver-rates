import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mapShiprocketStatus, shouldApplyTracking } from "../lib/shiprocket/tracking";
const read=(path:string)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

const mappings=[
  ["AWB Assigned","READY_TO_SHIP"],["Shipment Booked","READY_TO_SHIP"],["Pickup Scheduled","PICKUP_SCHEDULED"],
  ["Picked Up","IN_TRANSIT"],["Shipped","IN_TRANSIT"],["In Transit","IN_TRANSIT"],["Reached Destination Hub","IN_TRANSIT"],
  ["Out For Delivery","OUT_FOR_DELIVERY"],["Delivered","DELIVERED"],["Undelivered","IN_TRANSIT"],["Delayed","IN_TRANSIT"],
  ["Cancelled","CANCELLED"],["RTO Initiated","IN_TRANSIT"],["RTO In Transit","IN_TRANSIT"],["RTO Delivered","RETURNED"],
  ["Lost","IN_TRANSIT"],["Damaged","IN_TRANSIT"],["Pickup Exception","IN_TRANSIT"],["Delivery Exception","IN_TRANSIT"],
] as const;
for(const [raw,expected] of mappings)test(`maps Shiprocket status: ${raw}`,()=>assert.equal(mapShiprocketStatus(raw).shipmentStatus,expected));
test("protects terminal delivered status from downgrade",()=>assert.equal(shouldApplyTracking("DELIVERED","IN_TRANSIT"),false));
test("allows forward tracking progress",()=>assert.equal(shouldApplyTracking("SHIPPED","OUT_FOR_DELIVERY"),true));
test("manual fallback is explicit when integration is disabled",async()=>{const config=await read("lib/shiprocket/config.ts"),panel=await read("components/admin/ShiprocketPanel.tsx");assert.match(config,/SHIPROCKET_DISABLED/);assert.match(panel,/Manual shipment workflow remains available/)});
test("client caches token and refreshes once after 401",async()=>{const source=await read("lib/shiprocket/client.ts");assert.match(source,/cachedToken/);assert.match(source,/response.status===401&&!refreshed/);assert.match(source,/safeRetry/)});
test("client masks secrets and validates JSON",async()=>{const source=await read("lib/shiprocket/client.ts");assert.match(source,/maskSecret/);assert.match(source,/content-type/);assert.match(source,/console\.info\("\[logistics\] authenticated",\{provider:"configured",expiresInDays:9\}\)/)});
test("shipment creation is server mapped and idempotent",async()=>{const source=await read("lib/shiprocket/service.ts");assert.match(source,/assertShipmentEligibility/);assert.match(source,/order\.totalAmountPaise/);assert.match(source,/operationKey/);assert.match(source,/shiprocketOrderId/)});
test("serviceability preserves recommendation rather than cheapest-only selection",async()=>{const source=await read("lib/shiprocket/service.ts");assert.match(source,/is_recommended/);assert.match(source,/freightCharge/);assert.match(source,/rating/)});
test("AWB and pickup prevent duplicate operations",async()=>{const source=await read("lib/shiprocket/service.ts");assert.match(source,/AWB is already assigned/);assert.match(source,/Pickup is already scheduled/);assert.match(source,/shipment_id:\[/)});
test("label manifest and invoice validate prerequisites and secure URLs",async()=>{const source=await read("lib/shiprocket/service.ts");assert.match(source,/GENERATE_/);assert.match(source,/protocol===\"https:\"/);assert.match(source,/Schedule pickup before generating a manifest/)});
test("tracking events are deduplicated",async()=>{const source=await read("lib/shiprocket/service.ts");assert.match(source,/findFirst/);assert.match(source,/60\*60_000/)});
test("webhook uses constant-time secret validation and replay protection",async()=>{const source=await read("app/api/v1/logistics/events/route.ts");assert.match(source,/timingSafeEqual/);assert.match(source,/x-api-key/);assert.match(source,/payloadHash/);assert.match(source,/duplicate:true/)});
test("webhook resolves ownership only by stored AWB or shipment ID",async()=>{const source=await read("app/api/v1/logistics/events/route.ts");assert.match(source,/awbCode:awb/);assert.match(source,/shiprocketShipmentId:shipmentId/);assert.doesNotMatch(source,/customer_/i)});
test("customer refresh enforces authenticated ownership",async()=>{const source=await read("app/api/v1/me/orders/[orderId]/tracking/route.ts");assert.match(source,/authenticateSchemeUserFromRequest/);assert.match(source,/userId:auth\.userId/)});
test("reconciliation skips terminal shipments and batches provider requests",async()=>{const source=await read("app/api/cron/logistics-reconcile/route.ts");assert.match(source,/notIn:\[\"DELIVERED\",\"CANCELLED\",\"RETURNED\"\]/);assert.match(source,/take:40/);assert.match(source,/CRON_SECRET/)});
test("cancellation and NDR actions are audited and refunds stay separate",async()=>{const source=await read("lib/shiprocket/service.ts"),panel=await read("components/admin/ShiprocketPanel.tsx");assert.match(source,/SHIPROCKET_SHIPMENT_CANCELLED/);assert.match(source,/SHIPROCKET_NDR_/);assert.match(panel,/does not initiate a payment refund/)});
test("admin RBAC and CSRF guard all logistics actions",async()=>{const actions=await read("app/admin/(workspace)/orders/shiprocket-actions.ts"),auth=await read("lib/admin-orders.ts");assert.match(actions,/requireOrderAdmin\(\"shiprocket\"\)/);assert.match(auth,/CSRF_REJECTED/);assert.match(auth,/ADMIN_RATE_LIMITED/)});
test("website dashboard exposes safe real shipment data",async()=>{const api=await read("app/api/v1/me/dashboard/route.ts"),ui=await read("components/customer/CustomerDashboard.tsx");assert.match(api,/pickupStatus/);assert.match(api,/shiprocketLastSyncedAt/);assert.doesNotMatch(api,/shiprocketFailureReason/);assert.match(ui,/Refresh Tracking/)});
test("Android uses only RateStack tracking API",async()=>{const api=await read("android-ratestack/app/src/main/java/com/ratestack/app/data/RateStackApi.kt"),ui=await read("android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/MyOrdersScreen.kt");assert.match(api,/api\/v1\/me\/orders\/\{orderId\}\/tracking/);assert.doesNotMatch(api,/apiv2\.shiprocket/);assert.match(ui,/Track Shipment/)});
test("notification outbox retains shipment events",async()=>{const schema=await read("prisma/schema.prisma"),service=await read("lib/shiprocket/service.ts");assert.match(schema,/model NotificationOutbox/);assert.match(service,/enqueueNotification/)});
test("migration enforces duplicate operation AWB and webhook prevention",async()=>{const sql=await read("prisma/migrations/20260731010000_add_shiprocket_fulfilment/migration.sql");assert.match(sql,/ShopOrder_awbCode_key/);assert.match(sql,/ShiprocketOperation_idempotencyKey_key/);assert.match(sql,/LogisticsWebhookEvent_payloadHash_key/)});
