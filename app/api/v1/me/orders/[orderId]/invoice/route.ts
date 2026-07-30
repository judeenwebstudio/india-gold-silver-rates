import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";

const safe = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) return NextResponse.json({ success: false, error: { message: "Authentication required." } }, { status: 401 });
  const { orderId } = await context.params;
  const order = await prisma.shopOrder.findFirst({ where: { id: orderId, userId: auth.userId, invoiceNumber: { not: null } } });
  if (!order) return NextResponse.json({ success: false, error: { message: "Invoice not found." } }, { status: 404 });
  const inr = (value: bigint) => `₹${(Number(value) / 100).toLocaleString("en-IN")}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${safe(order.invoiceNumber)}</title><style>body{font-family:Arial;padding:40px;color:#292524}h1{color:#92400e}.row{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:10px 0}</style></head><body><h1>RateStack Invoice</h1><p>Invoice: <b>${safe(order.invoiceNumber)}</b></p><p>Order: ${safe(order.orderNumber)}</p><p>${safe(order.productName)} · ${safe(order.weightGrams)}g × ${order.quantity}</p><div class="row"><span>Metal Value</span><b>${inr(order.metalValuePaise)}</b></div><div class="row"><span>Service Charge</span><b>${inr(order.serviceChargePaise)}</b></div><div class="row"><span>GST (3%)</span><b>${inr(order.gstPaise)}</b></div><div class="row"><span>Shipping Cost</span><b>${order.shippingAmountPaise === 0n ? "FREE" : inr(order.shippingAmountPaise)}</b></div><div class="row"><span>Total Payable</span><b>${inr(order.totalAmountPaise)}</b></div><h2>Delivery Address</h2><p>${safe(order.addressLine1)}, ${safe(order.deliveryCity)}, ${safe(order.deliveryState)} – ${safe(order.deliveryPincode)}</p></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename="${order.invoiceNumber}.html"`, "Cache-Control": "private, no-store" } });
}
