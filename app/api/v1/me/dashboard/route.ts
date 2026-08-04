import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateSchemeUserFromRequest(request);
  if (!auth) {
    const rawHeader = request.headers.get("authorization") || request.headers.get("Authorization") || "NONE";
    console.warn(`[Dashboard Auth Log] Unauthorized dashboard request. Header snippet: ${rawHeader.slice(0, 30)}... | HTTP 401`);
    return NextResponse.json({ success: false, error: { message: "Authentication required." } }, { status: 401 });
  }

  console.log(`[Dashboard Auth Log] Authenticated request | customerId=${auth.userId} | token subject=${auth.email || auth.phone || auth.userId} | HTTP 200`);
  const [user, orders, addresses, gstProfile] = await Promise.all([
    prisma.schemeUser.findUnique({ where: { id: auth.userId }, include: { authAccounts: { select: { provider: true, providerEmail: true } } } }),
    prisma.shopOrder.findMany({ where: { userId: auth.userId }, include: { product: { select: { imageUrl: true, imageMimeType: true } }, trackingEvents: { select: { status: true, publicMessage: true, createdAt: true }, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } }),
    prisma.deliveryAddress.findMany({ where: { userId: auth.userId }, orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }] }),
    prisma.customerGSTProfile.findFirst({where:{customerId:auth.userId,isDefault:true},orderBy:{updatedAt:"desc"}}),
  ]);
  if (!user) {
    console.warn(`[Dashboard Auth Log] User record not found for customerId=${auth.userId} | HTTP 404`);
    return NextResponse.json({ success: false, error: { message: "Account not found." } }, { status: 404 });
  }
  const money = (value: bigint) => Number(value) / 100;
  const rows = orders.map(order => ({
    id: order.id, orderNumber: order.orderNumber, productId: order.productId, productName: order.productName,
    imageUrl: order.product.imageMimeType ? `/api/v1/shop/products/${order.productId}/image` : order.product.imageUrl,
    metalType: order.metalType, purity: order.purity, weightGrams: Number(order.weightGrams), quantity: order.quantity,
    metalValue: money(order.metalValuePaise), serviceCharge: money(order.serviceChargePaise), gst: money(order.gstPaise),
    shipping: money(order.shippingAmountPaise), total: money(order.totalAmountPaise), gateway: order.gateway,
    paymentStatus: order.paymentStatus, orderStatus: order.orderStatus, paymentId: order.gatewayPaymentId,
    invoiceNumber: order.invoiceNumber, paidAt: order.paidAt, createdAt: order.createdAt,
    deliveryAddress: order.addressLine1 ? {
      fullName: order.customerName, mobile: order.customerPhone, addressLine1: order.addressLine1, addressLine2: order.addressLine2,
      landmark: order.landmark, city: order.deliveryCity, district: order.deliveryDistrict, state: order.deliveryState,
      pincode: order.deliveryPincode, country: order.deliveryCountry, addressType: order.addressType,
    } : null,
    shipment: {
      courierPartner: order.courierName || order.courierPartner, trackingNumber: order.awbCode || order.trackingNumber,
      status: order.shipmentStatus || (order.paymentStatus === "SUCCESS" ? "Processing" : "Awaiting payment"),
      pickupStatus: order.pickupScheduledAt ? "PICKUP_SCHEDULED" : order.shiprocketOrderId ? "AWAITING_PICKUP" : "NOT_CREATED",
      expectedDelivery: order.estimatedDeliveryAt || order.expectedDeliveryAt, deliveredAt: order.deliveredAt,
      lastUpdated: order.shiprocketLastSyncedAt || order.updatedAt,
      timeline: order.trackingEvents.length ? order.trackingEvents.map(event => ({ label: event.publicMessage || event.status, at: event.createdAt })) : Array.isArray(order.shipmentTimelineJson) ? order.shipmentTimelineJson : [
        { label: "Order placed", at: order.createdAt },
        ...(order.paidAt ? [{ label: "Payment confirmed", at: order.paidAt }] : []),
      ],
      trackingUrl: order.publicTrackingUrl || (order.awbCode ? `https://shiprocket.co/tracking/${encodeURIComponent(order.awbCode)}` : null),
      message: order.awbCode ? null : "Shipment will be created after payment verification and order processing.",
    },
  }));
  const paid = rows.filter(order => order.paymentStatus === "SUCCESS");
  return NextResponse.json({ success: true, data: {
    customer: {
      id: user.id, fullName: user.fullName, phone: user.phone, email: user.email, profileImageUrl: user.profileImageUrl,
      emailVerified: Boolean(user.emailVerifiedAt), mobileVerified: Boolean(user.mobileVerifiedAt),
      googleConnected: user.authAccounts.some(account => account.provider === "GOOGLE"),
      memberSince: user.createdAt,
    },
    summary: { totalOrders: rows.length, paidOrders: paid.length, activeShipments: rows.filter(order => order.shipment.trackingNumber && !["Delivered", "Cancelled"].includes(order.shipment.status)).length, totalSpent: paid.reduce((sum, order) => sum + order.total, 0) },
    orders: rows, addresses, gstProfile, paymentHistory: rows.map(order => ({ orderNumber: order.orderNumber, gateway: order.gateway, paymentId: order.paymentId, status: order.paymentStatus, amount: order.total, date: order.paidAt || order.createdAt })),
    rewards: { points: 0, tier: "Classic", message: "Reward points will appear here when the rewards programme is enabled." },
    notifications: rows.slice(0, 5).map(order => ({ id: order.id, title: `${order.orderNumber}: ${order.orderStatus}`, date: order.createdAt })),
    wishlist: [],
  } }, { headers: { "Cache-Control": "private, no-store" } });
}
