import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { renderInvoicePdf } from "@/lib/invoice-pdf-renderer";

const cache = new Map<string, { expiresAt: number; pdf: Buffer }>();
const CACHE_MS = 5 * 60_000;

function invoiceFileName(invoiceNumber: string) {
  const normalized = invoiceNumber.replace(/[^A-Za-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 80);
  return `${normalized.startsWith("INV-SHOP-") ? normalized : `INV-SHOP-${normalized.replace(/^INV-?/, "")}`}.pdf`;
}

function address(parts: Array<string | null | undefined>) {
  return parts.map(part => part?.trim()).filter(Boolean).join(", ");
}

async function productImage(imageData: Uint8Array<ArrayBufferLike> | null, imageUrl: string | null) {
  let source: Buffer | null = imageData ? Buffer.from(imageData) : null;
  if (!source && imageUrl?.startsWith("/products/")) {
    const publicRoot = path.resolve(process.cwd(), "public");
    const resolved = path.resolve(publicRoot, imageUrl.replace(/^\/+/, ""));
    if (resolved.startsWith(`${publicRoot}${path.sep}`)) { try { source = await fs.readFile(resolved); } catch { source = null; } }
  }
  if (!source) return null;
  try { return await sharp(source).resize(240, 240, { fit: "contain", background: "#FFFFFF" }).png().toBuffer(); } catch { return null; }
}

export async function getInvoicePdf(orderId: string, customerId?: string) {
  const [order, merchant] = await Promise.all([
    prisma.shopOrder.findFirst({
      where: { id: orderId, ...(customerId ? { userId: customerId } : {}), invoiceNumber: { not: null } },
      include: { user: true, product: { select: { imageData: true, imageUrl: true } } },
    }),
    prisma.merchantConfig.findUnique({ where: { id: "default" } }),
  ]);
  if (!order?.invoiceNumber) return null;
  const key = `${order.id}:${order.updatedAt.toISOString()}:${merchant?.updatedAt.toISOString() || "default"}`;
  const existing = cache.get(key);
  if (existing && existing.expiresAt > Date.now()) return { pdf: existing.pdf, fileName: invoiceFileName(order.invoiceNumber), updatedAt: order.updatedAt };
  let logo: Buffer | null = null;
  try { logo = await fs.readFile(path.join(process.cwd(), "public", "ratestack-logo.png")); } catch { /* text fallback is rendered */ }
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://ratestack.in").replace(/\/$/, "");
  const shippingAddress = address([order.addressLine1, order.addressLine2, order.landmark ? `Near ${order.landmark}` : null, order.deliveryCity, order.deliveryDistrict, order.deliveryState, order.deliveryPincode, order.deliveryCountry]);
  const preparedProductImage = await productImage(order.product.imageData, order.product.imageUrl);
  const pdf = await renderInvoicePdf({
    invoiceNumber: order.invoiceNumber,
    orderNumber: order.orderNumber,
    invoiceDate: order.paidAt || order.createdAt,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.gateway,
    customer: { name: order.customerName || order.user.fullName, mobile: order.customerPhone || order.user.phone || "-", email: order.customerEmail || order.user.email || "-" },
    shippingAddress: shippingAddress || "Address unavailable for this historical order",
    product: {
      image: preparedProductImage,
      name: order.productName, metal: order.metalType, purity: order.purity,
      weight: `${Number(order.weightGrams).toLocaleString("en-IN")} g`, quantity: order.quantity,
      ratePaise: order.trichyRatePerGramPaise, amountPaise: order.metalValuePaise,
    },
    summary: {
      metalPaise: order.metalValuePaise, servicePaise: order.serviceChargePaise, gstPaise: order.gstPaise,
      shippingPaise: order.shippingAmountPaise, discountPaise: order.discountAmountPaise, totalPaise: order.totalAmountPaise,
    },
    company: {
      name: merchant?.legalSellerName || "RateStack Jewellery & Coins India Pvt Ltd",
      gstin: merchant?.gstin || "Not configured",
      address: process.env.INVOICE_COMPANY_ADDRESS || "Tiruchirappalli, Tamil Nadu, India",
      website: site,
      supportEmail: process.env.EMAIL_SUPPORT_EMAIL || "support@ratestack.in",
    },
    trackingUrl: order.publicTrackingUrl || `${site}/shop/orders?order=${encodeURIComponent(order.orderNumber)}`,
    gstBilling: order.gstInvoiceRequested ? { businessName: order.gstBusinessName || "-", gstin: order.gstNumber || "-", address: order.gstBillingAddress || "-" } : null,
    logo,
  });
  cache.set(key, { pdf, expiresAt: Date.now() + CACHE_MS });
  if (cache.size > 50) { const first = cache.keys().next().value; if (first) cache.delete(first); }
  return { pdf, fileName: invoiceFileName(order.invoiceNumber), updatedAt: order.updatedAt };
}

export function invoicePdfResponse(result: { pdf: Buffer; fileName: string; updatedAt: Date }, download: boolean) {
  return new Response(new Uint8Array(result.pdf), { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${result.fileName}"`,
    "Cache-Control": "private, max-age=300, must-revalidate",
    "Last-Modified": result.updatedAt.toUTCString(),
    "X-Content-Type-Options": "nosniff",
  } });
}
