"use client";

import { useEffect, useState } from "react";

type Props = {
  enrollment: { id: string; monthlyAmount?: number; paidInstallmentCount?: number; tenureMonths?: number; productName?: string; accountNumber?: string };
  dashboardData?: { enrollment?: { monthlyAmount?: number }; paidInstallmentCount?: number; totalInstallments?: number };
  userName: string;
  userPhone: string;
  onClose: () => void;
  onSuccess: (receiptNumber: string) => void;
  onFailure: (errorMessage: string) => void;
};

type Gateway = "RAZORPAY" | "PHONEPE";
type Order = {
  gateway: Gateway; paymentOrderId: string; gatewayOrderId: string; redirectUrl?: string;
  keyId?: string; amount: number; currency: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.head.appendChild(script);
  });
}

export function PaymentCheckoutModal(props: Props) {
  const { enrollment, dashboardData, onClose, onSuccess, onFailure } = props;
  const [gateway, setGateway] = useState<Gateway>("RAZORPAY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const amount = enrollment.monthlyAmount || dashboardData?.enrollment?.monthlyAmount || 0;
  const installment = (enrollment.paidInstallmentCount || dashboardData?.paidInstallmentCount || 0) + 1;

  useEffect(() => {
    fetch("/api/v1/payment/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setGateway(data.activeGateway === "PHONEPE" ? "PHONEPE" : "RAZORPAY"))
      .catch(() => setGateway("RAZORPAY"));
  }, []);

  async function verify(token: string, order: Order, result: Record<string, string>) {
    const res = await fetch(`/api/v1/me/schemes/${enrollment.id}/payments/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        paymentOrderId: order.paymentOrderId,
        gatewayPaymentId: result.razorpay_payment_id,
        gatewaySignature: result.razorpay_signature,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error?.message || "Payment verification failed.");
    onSuccess(data.data?.receiptNumber || "");
  }

  async function pay() {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
    if (!token) { setError("Session expired. Please log in again."); setLoading(false); return; }
    try {
      const configRes = await fetch("/api/v1/payment/config", { cache: "no-store" });
      const config = await configRes.json();
      const orderRes = await fetch(`/api/v1/me/schemes/${enrollment.id}/payments/order`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: "{}",
      });
      const body = await orderRes.json();
      if (!orderRes.ok || !body.success) throw new Error(body.error?.message || "Failed to create payment order.");
      const order: Order = body.data;
      setGateway(order.gateway);
      if (order.gateway === "PHONEPE") {
        if (!order.redirectUrl?.startsWith("https://")) throw new Error("PhonePe checkout is unavailable.");
        window.location.assign(order.redirectUrl);
        return;
      }
      await loadRazorpay();
      const checkout = new window.Razorpay!({
        key: config.razorpay?.keyId || order.keyId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        order_id: order.gatewayOrderId,
        name: "RateStack",
        description: `Scheme installment #${installment}`,
        prefill: { name: props.userName, contact: props.userPhone },
        handler: async (result: Record<string, string>) => {
          try { await verify(token, order, result); }
          catch (e) { const message = e instanceof Error ? e.message : "Verification failed."; setError(message); onFailure(message); }
          finally { setLoading(false); }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      checkout.open();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to start payment.";
      setError(message); onFailure(message); setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
      <div className="w-full max-w-lg space-y-5 rounded-3xl border border-amber-500/30 bg-stone-900 p-7 text-stone-100 shadow-2xl">
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-bold uppercase tracking-widest text-amber-400">Pay securely using {gateway === "RAZORPAY" ? "Razorpay" : "PhonePe"}</p><h2 className="mt-1 text-xl font-bold">Installment Payment</h2></div>
          <button onClick={onClose} disabled={loading} aria-label="Close" className="rounded-full bg-stone-800 px-3 py-1">×</button>
        </div>
        {error && <p role="alert" className="rounded-xl bg-red-950/50 p-3 text-sm text-red-300">{error}</p>}
        <div className="space-y-2 rounded-2xl bg-stone-950 p-4 text-sm">
          <div className="flex justify-between"><span className="text-stone-400">Scheme</span><strong>{enrollment.productName}</strong></div>
          <div className="flex justify-between"><span className="text-stone-400">Account</span><strong>{enrollment.accountNumber}</strong></div>
          <div className="flex justify-between"><span className="text-stone-400">Installment</span><strong>#{installment}</strong></div>
          <div className="flex justify-between border-t border-stone-800 pt-3 text-lg"><span>Total</span><strong className="text-amber-300">₹{amount.toLocaleString("en-IN")}</strong></div>
        </div>
        <div className="flex gap-3"><button onClick={onClose} disabled={loading} className="w-1/3 rounded-xl border border-stone-700 py-3">Cancel</button><button onClick={pay} disabled={loading} className="w-2/3 rounded-xl bg-amber-500 py-3 font-bold text-stone-950 disabled:opacity-50">{loading ? "Preparing secure checkout…" : `Pay with ${gateway === "RAZORPAY" ? "Razorpay" : "PhonePe"}`}</button></div>
      </div>
    </div>
  );
}
