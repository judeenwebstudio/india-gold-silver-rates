import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateSchemeUserFromRequest } from "@/lib/schemes/user-auth";
import { refreshTracking } from "@/lib/shiprocket/service";
import { ShiprocketError } from "@/lib/shiprocket/config";

export const dynamic = "force-dynamic";

async function buildTrackingPayload(orderId: string) {
  const order = await prisma.shopOrder.findUnique({
    where: { id: orderId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          metalType: true,
          purity: true,
          imageUrl: true,
          imageData: true,
          imageMimeType: true,
        },
      },
      trackingEvents: {
        select: {
          id: true,
          status: true,
          publicMessage: true,
          internalNote: true,
          source: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
      statusHistory: {
        select: {
          id: true,
          status: true,
          publicMessage: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) return null;

  const imageUrl = order.product.imageMimeType
    ? `/api/v1/shop/products/${order.productId}/image`
    : order.product.imageUrl;

  const isTerminal = ["DELIVERED", "CANCELLED", "RETURNED"].includes(order.shipmentStatus);

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      invoiceNumber: order.invoiceNumber,
      createdAt: order.createdAt,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      shipmentStatus: order.shipmentStatus,
      courierPartner: order.courierName || order.courierPartner || "RateStack Secure Logistics",
      courierName: order.courierName || order.courierPartner || null,
      courierId: order.courierId || null,
      trackingNumber: order.awbCode || order.trackingNumber || null,
      awbCode: order.awbCode || order.trackingNumber || null,
      shipmentId: order.shipmentId || order.shiprocketShipmentId || null,
      expectedDeliveryAt: order.expectedDeliveryAt || order.estimatedDeliveryAt || null,
      pickupAt: order.pickupAt || order.pickupScheduledAt || null,
      deliveredAt: order.deliveredAt || null,
      publicTrackingUrl: order.publicTrackingUrl || null,
      lastSyncedAt: order.shiprocketLastSyncedAt || order.updatedAt,
      isTerminal,
    },
    deliveryAddress: {
      customerName: order.customerName || "Customer",
      customerPhone: order.customerPhone || null,
      customerEmail: order.customerEmail || null,
      addressLine1: order.addressLine1 || "",
      addressLine2: order.addressLine2 || null,
      landmark: order.landmark || null,
      deliveryCity: order.deliveryCity || "",
      deliveryDistrict: order.deliveryDistrict || "",
      deliveryState: order.deliveryState || "",
      deliveryPincode: order.deliveryPincode || "",
      deliveryCountry: order.deliveryCountry || "India",
    },
    summary: {
      productId: order.productId,
      productName: order.productName,
      metalType: order.metalType,
      purity: order.purity,
      weightGrams: Number(order.weightGrams),
      quantity: order.quantity,
      ratePerGram: Number(order.trichyRatePerGramPaise) / 100,
      metalValue: Number(order.metalValuePaise) / 100,
      serviceCharge: Number(order.serviceChargePaise) / 100,
      gst: Number(order.gstPaise) / 100,
      shipping: Number(order.shippingAmountPaise) / 100,
      total: Number(order.totalAmountPaise) / 100,
      imageUrl,
    },
    events: order.trackingEvents.map((e) => ({
      id: e.id,
      status: e.status,
      message: e.publicMessage,
      location: e.internalNote || null,
      source: e.source,
      createdAt: e.createdAt,
    })),
    statusHistory: order.statusHistory.map((s) => ({
      id: s.id,
      status: s.status,
      message: s.publicMessage,
      createdAt: s.createdAt,
    })),
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const authUser = await authenticateSchemeUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { orderId } = await params;
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, userId: authUser.userId },
    select: { id: true },
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: { message: "Order not found or access denied." } },
      { status: 404 }
    );
  }

  const payload = await buildTrackingPayload(order.id);
  return NextResponse.json(
    { success: true, data: payload },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const authUser = await authenticateSchemeUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json(
      { success: false, error: { message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { orderId } = await params;
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, userId: authUser.userId },
    select: { id: true, awbCode: true },
  });

  if (!order) {
    return NextResponse.json(
      { success: false, error: { message: "Order not found or access denied." } },
      { status: 404 }
    );
  }

  if (order.awbCode) {
    try {
      await refreshTracking(order.id);
    } catch (err) {
      console.warn("Manual tracking refresh error:", err);
    }
  }

  const payload = await buildTrackingPayload(order.id);
  return NextResponse.json(
    { success: true, data: payload },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
