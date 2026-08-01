import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { renderInvoicePdf } from "../lib/invoice-pdf-renderer";

const output = path.join(os.tmpdir(), "ratestack-pdf-tests", "ratestack-invoice-sample.pdf");

const sample = (overrides: Partial<Parameters<typeof renderInvoicePdf>[0]> = {}): Parameters<typeof renderInvoicePdf>[0] => ({
  invoiceNumber: "INV-SHOP-00001234", orderNumber: "SHOP-00001234", invoiceDate: new Date("2026-08-01T05:30:00Z"), paymentStatus: "SUCCESS", paymentMethod: "RAZORPAY",
  customer: { name: "Sample Customer", mobile: "9876543210", email: "customer@example.com" },
  shippingAddress: "12 Sample Street, Tiruchirappalli, Tamil Nadu, 620001, India",
  product: { name: "Gold 22K Coin", metal: "GOLD", purity: "K22", weight: "10 g", quantity: 1, ratePaise: 680000n, amountPaise: 6800000n },
  summary: { metalPaise: 6800000n, servicePaise: 340000n, gstPaise: 214200n, shippingPaise: 0n, discountPaise: 0n, totalPaise: 7354200n },
  company: { name: "RateStack Jewellery & Coins India Pvt Ltd", gstin: "33AAAAA0000A1Z5", address: "Tiruchirappalli, Tamil Nadu, India", website: "https://ratestack.in", supportEmail: "support@ratestack.in" },
  trackingUrl: "https://ratestack.in/shop/orders?order=SHOP-00001234",
  ...overrides,
});

test("shared premium renderer generates a print-ready PDF with QR and barcode", async () => {
  const [logo, productImage] = await Promise.all([fs.readFile("public/ratestack-logo.png"), fs.readFile("public/android-chrome-192x192.png")]);
  const pdf = await renderInvoicePdf(sample({ product: { ...sample().product, image: productImage }, logo }));
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(pdf.length > 10_000);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, pdf);
});

test("missing optional image, courier, AWB and tracking URL do not crash", async () => {
  const pdf = await renderInvoicePdf(sample({ trackingUrl: "", product: { ...sample().product, image: null } }));
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
});

test("customer endpoint enforces invoice ownership and returns PDF", async () => {
  const route = await fs.readFile("app/api/v1/me/orders/[orderId]/invoice/route.ts", "utf8");
  const service = await fs.readFile("lib/invoice-pdf.ts", "utf8");
  assert.match(route, /authenticateSchemeUserFromRequest/);
  assert.match(route, /export const runtime = "nodejs"/);
  assert.match(route, /getInvoicePdf\(orderId, auth\.userId\)/);
  assert.match(service, /userId: customerId/);
  assert.match(service, /paymentStatus !== "SUCCESS"/);
  assert.match(route, /status: 401/);
  assert.match(route, /status: error\.code === "NOT_FOUND" \? 404 : 409/);
  assert.match(service, /Content-Type": "application\/pdf/);
  assert.match(service, /INV-SHOP-/);
});

test("admin endpoint uses the same PDF renderer and retains RBAC", async () => {
  const route = await fs.readFile("app/api/v1/admin/orders/[orderId]/document/route.ts", "utf8");
  assert.match(route, /requireOrderAdmin\("view"\)/);
  assert.match(route, /export const runtime = "nodejs"/);
  assert.match(route, /getInvoicePdf\(orderId\)/);
  assert.match(route, /invoicePdfResponse\(invoice,download\)/);
  assert.match(route, /InvoicePdfError/);
});

test("admin view and download use the order database identifier", async () => {
  const page = await fs.readFile("app/admin/(workspace)/invoices/page.tsx", "utf8");
  assert.match(page, /orders\/\$\{o\.id\}\/document\?type=invoice/);
  assert.match(page, /document\?type=invoice&download=1/);
  assert.match(page, /target="_blank"/);
});

test("PDF response headers select inline or attachment and never HTML", async () => {
  const service = await fs.readFile("lib/invoice-pdf.ts", "utf8");
  assert.match(service, /"Content-Type": "application\/pdf"/);
  assert.match(service, /download \? "attachment" : "inline"/);
  assert.match(service, /filename="\$\{result\.fileName\}"/);
  assert.doesNotMatch(service, /text\/html/);
});

test("customer and Android downloads use PDF filenames and MIME type", async () => {
  const [dashboard, android] = await Promise.all([fs.readFile("components/customer/CustomerDashboard.tsx", "utf8"), fs.readFile("android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/MyOrdersScreen.kt", "utf8")]);
  assert.match(dashboard, /\.pdf`/);
  assert.match(dashboard, /api\/v1\/me\/orders\/\$\{order\.id\}\/invoice/);
  assert.match(dashboard, /setTimeout\(\(\)=>URL\.revokeObjectURL/);
  assert.match(android, /\.pdf"/);
  assert.match(android, /application\/pdf/);
});
