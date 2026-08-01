"use client";

import { use, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";

type TrackingData = {
  order: {
    id: string;
    orderNumber: string;
    invoiceNumber: string | null;
    createdAt: string;
    paymentStatus: string;
    orderStatus: string;
    shipmentStatus: string;
    courierPartner: string;
    courierName: string | null;
    courierId: string | null;
    trackingNumber: string | null;
    awbCode: string | null;
    shipmentId: string | null;
    expectedDeliveryAt: string | null;
    pickupAt: string | null;
    deliveredAt: string | null;
    publicTrackingUrl: string | null;
    lastSyncedAt: string;
    isTerminal: boolean;
  };
  deliveryAddress: {
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    addressLine1: string;
    addressLine2: string | null;
    landmark: string | null;
    deliveryCity: string;
    deliveryDistrict: string;
    deliveryState: string;
    deliveryPincode: string;
    deliveryCountry: string;
  };
  summary: {
    productId: string;
    productName: string;
    metalType: string;
    purity: string;
    weightGrams: number;
    quantity: number;
    ratePerGram: number;
    metalValue: number;
    serviceCharge: number;
    gst: number;
    shipping: number;
    total: number;
    imageUrl: string | null;
  };
  events: Array<{
    id: string;
    status: string;
    message: string;
    location: string | null;
    source: string;
    createdAt: string;
  }>;
  statusHistory: Array<{
    id: string;
    status: string;
    message: string;
    createdAt: string;
  }>;
};

const TIMELINE_STAGES = [
  { key: "ORDER_PLACED", label: "Order Placed" },
  { key: "PAYMENT_CONFIRMED", label: "Payment Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "PACKED", label: "Packed" },
  { key: "PICKUP_SCHEDULED", label: "Pickup Scheduled" },
  { key: "SHIPPED", label: "Picked Up" },
  { key: "IN_TRANSIT", label: "In Transit" },
  { key: "DESTINATION_CITY", label: "Reached Destination City" },
  { key: "OUT_FOR_DELIVERY", label: "Out For Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

function getStageIndex(shipmentStatus: string, orderStatus: string): number {
  if (shipmentStatus === "DELIVERED" || orderStatus === "DELIVERED") return 9;
  if (shipmentStatus === "OUT_FOR_DELIVERY" || orderStatus === "OUT_FOR_DELIVERY") return 8;
  if (shipmentStatus === "IN_TRANSIT" || orderStatus === "IN_TRANSIT") return 6;
  if (shipmentStatus === "SHIPPED" || orderStatus === "SHIPPED") return 5;
  if (shipmentStatus === "PICKUP_SCHEDULED") return 4;
  if (orderStatus === "PACKED" || shipmentStatus === "READY_TO_SHIP") return 3;
  if (orderStatus === "PROCESSING") return 2;
  if (orderStatus === "ORDER_CONFIRMED" || orderStatus === "PAYMENT_VERIFIED") return 1;
  return 0;
}

export default function OrderTrackingPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const fetchTracking = useCallback(async (isManualRefresh = false) => {
    const token =
      localStorage.getItem("scheme_user_token") ||
      localStorage.getItem("ratestack_user_token");

    if (!token) {
      setError("Please sign in to view your order tracking.");
      setLoading(false);
      return;
    }

    if (isManualRefresh) setRefreshing(true);

    try {
      const response = await fetch(`/api/v1/me/orders/${orderId}/tracking`, {
        method: isManualRefresh ? "POST" : "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (response.status === 401) {
        setShowAuth(true);
        setError("Authentication required.");
        return;
      }

      const body = await response.json();
      if (body.success) {
        setData(body.data);
        setError(null);
      } else {
        setError(body.error?.message || "Order tracking details not available.");
      }
    } catch {
      setError("Network error fetching tracking information.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    void fetchTracking(false);
  }, [fetchTracking]);

  // Auto-refresh every 60 seconds unless order is terminal (Delivered, Cancelled, Returned)
  useEffect(() => {
    if (!data || data.order.isTerminal) return;

    const interval = setInterval(() => {
      void fetchTracking(false);
    }, 60_000);

    return () => clearInterval(interval);
  }, [data, fetchTracking]);

  const currentStageIndex = data
    ? getStageIndex(data.order.shipmentStatus, data.order.orderStatus)
    : 0;

  const isCancelled = data?.order.shipmentStatus === "CANCELLED" || data?.order.orderStatus === "CANCELLED";
  const isReturned = data?.order.shipmentStatus === "RETURNED" || data?.order.orderStatus === "RETURNED";

  return (
    <div className="min-h-screen bg-[#0f0d0b] text-stone-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/shop/orders"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
          >
            ← Back to Recent Orders
          </Link>

          {data && (
            <button
              onClick={() => void fetchTracking(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin" : ""}>🔄</span>
              {refreshing ? "Refreshing..." : "Refresh Tracking"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-stone-400 animate-pulse space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-semibold">Loading shipment tracking details...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/40 bg-red-950/30 p-8 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 grid place-items-center mx-auto text-red-400 text-2xl font-bold">
              ⚠️
            </div>
            <h2 className="text-lg font-bold text-stone-100">Tracking Unavailable</h2>
            <p className="text-xs text-stone-400 leading-relaxed">{error}</p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setShowAuth(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs"
              >
                Sign In
              </button>
              <Link
                href="/shop/orders"
                className="px-5 py-2.5 rounded-xl border border-stone-700 text-stone-300 font-bold text-xs"
              >
                View Orders
              </Link>
            </div>
          </div>
        ) : data ? (
          <>
            {/* 1. PAGE HEADER CARD */}
            <section className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-stone-900 via-amber-950/30 to-stone-900 p-6 md:p-8 space-y-6 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-[0.68rem] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
                    Live Order Tracking
                  </span>
                  <h1 className="font-display text-2xl md:text-4xl font-extrabold text-stone-100 tracking-tight">
                    Order #{data.order.orderNumber}
                  </h1>
                  <p className="text-xs text-stone-400 mt-1">
                    Placed on {new Date(data.order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`px-4 py-2 rounded-2xl text-xs font-black uppercase border ${
                    isCancelled
                      ? "bg-red-500/20 text-red-300 border-red-500/40"
                      : isReturned
                      ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                      : data.order.shipmentStatus === "DELIVERED"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  }`}>
                    {isCancelled ? "🔴 Cancelled" : isReturned ? "🔁 Returned" : data.order.shipmentStatus === "DELIVERED" ? "✅ Delivered" : `🟢 ${data.order.shipmentStatus.replace(/_/g, " ")}`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                  <span className="text-stone-500 block font-semibold mb-1">Invoice Reference</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {data.order.invoiceNumber || "Generated on Dispatch"}
                  </span>
                </div>
                <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                  <span className="text-stone-500 block font-semibold mb-1">Courier Partner</span>
                  <span className="font-bold text-stone-200 text-sm">
                    {data.order.courierPartner}
                  </span>
                </div>
                <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                  <span className="text-stone-500 block font-semibold mb-1">AWB / Tracking No.</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {data.order.awbCode || "Booking Pending"}
                  </span>
                </div>
                <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                  <span className="text-stone-500 block font-semibold mb-1">Expected Delivery</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {data.order.expectedDeliveryAt
                      ? new Date(data.order.expectedDeliveryAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "To be confirmed"}
                  </span>
                </div>
              </div>
            </section>

            {/* 2. PREMIUM VERTICAL TIMELINE */}
            <section className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 md:p-8 space-y-6 shadow-xl">
              <div className="flex justify-between items-center border-b border-stone-800 pb-4">
                <h2 className="font-display text-xl font-bold text-stone-100">
                  Shipment Progress Timeline
                </h2>
                <span className="text-xs text-stone-500">
                  Auto-updated 60s
                </span>
              </div>

              {isCancelled ? (
                <div className="p-6 rounded-2xl border border-red-500/30 bg-red-950/20 text-center space-y-2">
                  <span className="text-2xl">🔴</span>
                  <h3 className="font-bold text-red-300 text-sm">Order Cancelled</h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    This order or shipment has been cancelled. If payment was processed, refund processing is recorded below.
                  </p>
                </div>
              ) : isReturned ? (
                <div className="p-6 rounded-2xl border border-orange-500/30 bg-orange-950/20 text-center space-y-2">
                  <span className="text-2xl">🔁</span>
                  <h3 className="font-bold text-orange-300 text-sm">Shipment Returned</h3>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    The package has been returned to the RateStack vault. Customer support is coordinating fulfillment or refund.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-800">
                  {TIMELINE_STAGES.map((stage, idx) => {
                    const isDone = idx < currentStageIndex;
                    const isCurrent = idx === currentStageIndex;

                    return (
                      <div key={stage.key} className="relative flex items-start gap-4 transition-all">
                        {/* Dot Indicator */}
                        <div className={`absolute -left-[1.65rem] top-1 h-5 w-5 rounded-full border-2 grid place-items-center transition-all ${
                          isDone
                            ? "bg-emerald-500 border-emerald-400 text-stone-950"
                            : isCurrent
                            ? "bg-amber-400 border-amber-300 ring-4 ring-amber-400/20 animate-pulse text-stone-950"
                            : "bg-stone-900 border-stone-700 text-stone-600"
                        }`}>
                          {isDone ? (
                            <span className="text-[10px] font-black">✓</span>
                          ) : isCurrent ? (
                            <span className="h-2 w-2 rounded-full bg-stone-950" />
                          ) : null}
                        </div>

                        <div>
                          <h3 className={`text-sm font-bold transition-colors ${
                            isDone
                              ? "text-emerald-400"
                              : isCurrent
                              ? "text-amber-300 font-black text-base"
                              : "text-stone-500"
                          }`}>
                            {stage.label}
                          </h3>

                          {isCurrent && (
                            <p className="text-xs text-stone-300 mt-1 font-medium bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 inline-block">
                              Current Stage • In progress
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* 3. LIVE MAP PLACEHOLDER */}
            <section className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 md:p-8 space-y-4 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  <h2 className="font-display text-lg font-bold text-stone-100">Live Vehicle Tracking</h2>
                </div>
                <span className="text-xs font-mono text-stone-500">GPS Stream</span>
              </div>

              <div className="relative h-48 sm:h-64 rounded-2xl border border-stone-800 bg-stone-950 p-6 flex flex-col items-center justify-center text-center space-y-3 overflow-hidden">
                {/* Simulated Grid / Radar Lines */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,160,49,.08),transparent_70%)] pointer-events-none" />
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 grid place-items-center text-amber-400 text-2xl font-bold">
                  📍
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-300">Live vehicle tracking is currently unavailable.</p>
                  <p className="text-xs text-stone-500 mt-1 max-w-sm">
                    GPS live map telemetry will connect automatically once courier driver assignment is active.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. CHRONOLOGICAL TRACKING EVENTS */}
            <section className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 md:p-8 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <h2 className="font-display text-lg font-bold text-stone-100">Shipment Event Log</h2>
                <span className="text-xs text-stone-500">{data.events.length} Events</span>
              </div>

              {data.events.length === 0 ? (
                <p className="text-xs text-stone-500 italic py-4 text-center">
                  Detailed courier events will appear after package scan at the hub.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.events.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-2xl border border-stone-800/80 bg-stone-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-amber-300 text-sm block">{event.message}</span>
                        {event.location && <span className="text-stone-400 block">{event.location}</span>}
                        <span className="text-[0.68rem] text-stone-500 uppercase tracking-wider block font-mono">Source: {event.source}</span>
                      </div>

                      <span className="font-mono text-stone-400 text-[0.75rem] shrink-0 bg-stone-900 px-3 py-1.5 rounded-xl border border-stone-800">
                        {new Date(event.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} • {new Date(event.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 5. SHIPMENT DETAILS & DELIVERY ADDRESS */}
            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 space-y-4 shadow-xl">
                <h2 className="font-display text-lg font-bold text-amber-200 border-b border-stone-800 pb-3">
                  Shipment Specification
                </h2>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-800/60"><span className="text-stone-400">Courier Partner</span><span className="font-bold text-stone-100">{data.order.courierPartner}</span></div>
                  <div className="flex justify-between py-1 border-b border-stone-800/60"><span className="text-stone-400">Tracking / AWB Code</span><span className="font-mono font-bold text-amber-300">{data.order.awbCode || "Pending"}</span></div>
                  <div className="flex justify-between py-1 border-b border-stone-800/60"><span className="text-stone-400">Shipping Method</span><span className="font-bold text-stone-100">Insured Vault Express</span></div>
                  <div className="flex justify-between py-1 border-b border-stone-800/60"><span className="text-stone-400">Package Weight</span><span className="font-bold text-stone-100">{data.summary.weightGrams}g (Net Metal)</span></div>
                  <div className="flex justify-between py-1"><span className="text-stone-400">Package Count</span><span className="font-bold text-emerald-400">1 Box (Tamper-evident, Insured)</span></div>
                </div>
              </section>

              <section className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 space-y-4 shadow-xl">
                <h2 className="font-display text-lg font-bold text-amber-200 border-b border-stone-800 pb-3">
                  Destination Delivery Address
                </h2>
                <div className="text-xs text-stone-300 space-y-1">
                  <p className="font-bold text-stone-100 text-sm">{data.deliveryAddress.customerName}</p>
                  <p className="text-amber-300 font-mono">{data.deliveryAddress.customerPhone || "Mobile provided"}</p>
                  <p className="pt-1">{data.deliveryAddress.addressLine1}</p>
                  {data.deliveryAddress.addressLine2 && <p>{data.deliveryAddress.addressLine2}</p>}
                  {data.deliveryAddress.landmark && <p className="text-stone-400">Landmark: {data.deliveryAddress.landmark}</p>}
                  <p>{data.deliveryAddress.deliveryCity}, {data.deliveryAddress.deliveryDistrict}, {data.deliveryAddress.deliveryState} – {data.deliveryAddress.deliveryPincode}</p>
                  <p className="text-stone-400 pt-1">{data.deliveryAddress.deliveryCountry}</p>
                </div>
              </section>
            </div>

            {/* 6. ORDER ITEM SUMMARY */}
            <section className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 md:p-8 space-y-6 shadow-xl">
              <h2 className="font-display text-lg font-bold text-stone-100 border-b border-stone-800 pb-4">
                Order Item Summary
              </h2>

              <div className="grid gap-6 md:grid-cols-[140px_1fr] items-center">
                <div className="relative h-32 w-full rounded-2xl bg-white p-3 overflow-hidden">
                  {data.summary.imageUrl && (
                    <Image
                      src={data.summary.imageUrl}
                      alt={data.summary.productName}
                      fill
                      className="object-contain p-2"
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-stone-100">{data.summary.productName}</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Purity: <strong className="text-amber-300">{data.summary.purity}</strong> • Weight: <strong className="text-amber-300">{data.summary.weightGrams}g</strong> • Quantity: <strong className="text-stone-200">{data.summary.quantity}</strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-stone-950 p-4 rounded-2xl border border-stone-800">
                    <div><span className="text-stone-500 block">Metal Value</span><span className="font-bold text-stone-100">₹{data.summary.metalValue.toLocaleString("en-IN")}</span></div>
                    <div><span className="text-stone-500 block">Service Charge</span><span className="font-bold text-stone-100">₹{data.summary.serviceCharge.toLocaleString("en-IN")}</span></div>
                    <div><span className="text-stone-500 block">GST (3%)</span><span className="font-bold text-stone-100">₹{data.summary.gst.toLocaleString("en-IN")}</span></div>
                    <div><span className="text-stone-500 block">Total Paid</span><span className="font-extrabold text-amber-300 text-sm">₹{data.summary.total.toLocaleString("en-IN")}</span></div>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </main>

      {showAuth && (
        <AuthModal
          initialMode="login"
          redirectTo={`/shop/orders/${orderId}/tracking`}
          onClose={() => setShowAuth(false)}
          onSuccess={() => {
            setShowAuth(false);
            void fetchTracking(false);
          }}
        />
      )}

      <Footer />
    </div>
  );
}
