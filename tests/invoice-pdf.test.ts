import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { renderInvoicePdf } from "../lib/invoice-pdf-renderer";

const output = path.join(os.tmpdir(), "ratestack-pdf-tests", "ratestack-invoice-sample.pdf");

test("shared premium renderer generates a print-ready PDF with QR and barcode", async () => {
  const [logo, productImage] = await Promise.all([fs.readFile("public/ratestack-logo.png"), fs.readFile("public/android-chrome-192x192.png")]);
  const pdf = await renderInvoicePdf({
    invoiceNumber: "INV-SHOP-00001234", orderNumber: "SHOP-00001234", invoiceDate: new Date("2026-08-01T05:30:00Z"), paymentStatus: "SUCCESS", paymentMethod: "RAZORPAY",
    customer: { name: "Sample Customer", mobile: "9876543210", email: "customer@example.com" },
    shippingAddress: "12 Sample Street, Tiruchirappalli, Tamil Nadu, 620001, India",
    product: { image: productImage, name: "Gold 22K Coin", metal: "GOLD", purity: "K22", weight: "10 g", quantity: 1, ratePaise: 680000n, amountPaise: 6800000n },
    summary: { metalPaise: 6800000n, servicePaise: 340000n, gstPaise: 214200n, shippingPaise: 0n, discountPaise: 0n, totalPaise: 7354200n },
    company: { name: "RateStack Jewellery & Coins India Pvt Ltd", gstin: "33AAAAA0000A1Z5", address: "Tiruchirappalli, Tamil Nadu, India", website: "https://ratestack.in", supportEmail: "support@ratestack.in" },
    trackingUrl: "https://ratestack.in/shop/orders?order=SHOP-00001234", logo,
  });
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.ok(pdf.length > 10_000);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, pdf);
});

test("customer endpoint enforces invoice ownership and returns PDF", async () => {
  const route = await fs.readFile("app/api/v1/me/orders/[orderId]/invoice/route.ts", "utf8");
  const service = await fs.readFile("lib/invoice-pdf.ts", "utf8");
  assert.match(route, /authenticateSchemeUserFromRequest/);
  assert.match(route, /getInvoicePdf\(orderId, auth\.userId\)/);
  assert.match(service, /userId: customerId/);
  assert.match(service, /Content-Type": "application\/pdf/);
  assert.match(service, /INV-SHOP-/);
});

test("admin endpoint uses the same PDF renderer and retains RBAC", async () => {
  const route = await fs.readFile("app/api/v1/admin/orders/[orderId]/document/route.ts", "utf8");
  assert.match(route, /requireOrderAdmin\("view"\)/);
  assert.match(route, /getInvoicePdf\(orderId\)/);
  assert.match(route, /invoicePdfResponse\(invoice,download\)/);
});

test("customer and Android downloads use PDF filenames and MIME type", async () => {
  const [dashboard, android] = await Promise.all([fs.readFile("components/customer/CustomerDashboard.tsx", "utf8"), fs.readFile("android-ratestack/app/src/main/java/com/ratestack/app/ui/shop/MyOrdersScreen.kt", "utf8")]);
  assert.match(dashboard, /\.pdf`/);
  assert.match(android, /\.pdf"/);
  assert.match(android, /application\/pdf/);
});
