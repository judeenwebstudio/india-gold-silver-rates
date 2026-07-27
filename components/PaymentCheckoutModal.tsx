"use client";

import { useState } from "react";

type PaymentCheckoutModalProps = {
  enrollment: {
    id: string;
    monthlyAmount?: number;
    paidInstallmentCount?: number;
    tenureMonths?: number;
    productName?: string;
    accountNumber?: string;
  };
  dashboardData?: {
    enrollment?: { monthlyAmount?: number };
    paidInstallmentCount?: number;
    totalInstallments?: number;
  };
  userName: string;
  userPhone: string;
  onClose: () => void;
  onSuccess: (receiptNumber: string) => void;
  onFailure: (errorMessage: string) => void;
};

type PhonePeOrder = {
  gateway?: string;
  redirectUrl?: string;
  paymentOrderId?: string;
  gatewayOrderId?: string;
};

/**
 * The web checkout is intentionally PhonePe-only. The order endpoint remains
 * the source of truth, while this component only follows its secure redirect.
 */
export function PaymentCheckoutModal(props: PaymentCheckoutModalProps) {
  const { enrollment, dashboardData, onClose } = props;
  const [step, setStep] = useState<"summary" | "processing">("summary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrderDetails, setPendingOrderDetails] = useState<PhonePeOrder | null>(null);

  const activeGateway = "PHONEPE";
  const monthlyAmount = enrollment?.monthlyAmount || dashboardData?.enrollment?.monthlyAmount || 0;
  const nextInstallmentNo = (enrollment?.paidInstallmentCount || dashboardData?.paidInstallmentCount || 0) + 1;
  const totalInstallments = enrollment?.tenureMonths || dashboardData?.totalInstallments || 12;
  const totalPayable = monthlyAmount;

  const handleInitiatePayment = async () => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
    if (!token) {
      setError("Session expired. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const orderRes = await fetch(`/api/v1/me/schemes/${enrollment.id}/payments/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error?.message || "Failed to create payment order");
      }

      const order: PhonePeOrder = orderData.data || {};
      const { gateway, redirectUrl } = order;
      setPendingOrderDetails(order);
      console.log({ gateway, redirectUrl });

      if (gateway !== "PHONEPE") {
        throw new Error("PhonePe is the only supported payment gateway.");
      }

      if (!redirectUrl || !redirectUrl.startsWith("https://")) {
        throw new Error("PhonePe checkout URL was not returned.");
      }

      setStep("processing");
      window.location.assign(redirectUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to launch PhonePe checkout";
      setError(message);
      setStep("summary");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4 text-stone-100 font-sans">
      <div className="w-full max-w-lg rounded-3xl bg-stone-900 border border-amber-500/30 p-6 md:p-8 shadow-2xl space-y-5">
        <div className="flex justify-between items-center border-b border-stone-800 pb-4">
          <div>
            <span className="text-[0.68rem] font-bold text-amber-400 uppercase tracking-widest block">
              PhonePe Payment Gateway Checkout Flow
            </span>
            <h2 className="font-display text-xl font-bold text-stone-100 mt-0.5">
              Installment Payment Summary
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close payment dialog"
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 grid place-items-center font-bold text-sm"
          >
            ×
          </button>
        </div>

        <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-[0.72rem] font-mono text-amber-300 space-y-1">
          <div className="font-bold border-b border-amber-500/20 pb-1 text-amber-200">Runtime Payment Gateway Debug Info</div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-400">Active Gateway:</span>
            <span className="font-bold text-white">{activeGateway}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-400">API Response Gateway:</span>
            <span className="font-bold text-white">{pendingOrderDetails?.gateway || "Pending"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-stone-400">Redirect URL:</span>
            <span className="font-bold text-white">{pendingOrderDetails?.redirectUrl ? "Present" : "Missing"}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs font-bold text-red-300" role="alert">
            ⚠ {error}
          </div>
        )}

        {step === "summary" && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-stone-950/80 border border-stone-800 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                <span className="text-stone-400">Scheme Name:</span>
                <span className="font-bold text-amber-300 text-right">{enrollment.productName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Scheme Account Number:</span>
                <span className="font-mono font-bold text-stone-200">#{enrollment.accountNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Installment Number:</span>
                <span className="font-bold text-emerald-400">Installment #{nextInstallmentNo} of {totalInstallments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Monthly Installment Amount:</span>
                <span className="font-bold text-stone-100">₹{monthlyAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Processing Charges:</span>
                <span className="font-bold text-emerald-400">₹0.00 (Zero Hidden Fee)</span>
              </div>
              <div className="flex justify-between items-center border-t border-stone-800 pt-2.5 text-sm">
                <span className="font-bold text-stone-200">Total Payable Amount:</span>
                <span className="font-extrabold text-amber-300 text-lg">₹{totalPayable.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[0.7rem] font-bold text-stone-400 uppercase tracking-wider block">
                Available Payment Options (PhonePe Standard Checkout):
              </span>
              <div className="grid grid-cols-2 gap-2 text-[0.7rem]">
                <div className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/40 space-y-1">
                  <span className="font-bold text-amber-300 block">📱 UPI Payment Apps</span>
                  <span className="text-stone-400 block">PhonePe, Google Pay, Paytm, BHIM, Any UPI</span>
                </div>
                <div className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/40 space-y-1">
                  <span className="font-bold text-amber-300 block">💳 Credit Cards</span>
                  <span className="text-stone-400 block">Visa, Mastercard, RuPay, Amex</span>
                </div>
                <div className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/40 space-y-1">
                  <span className="font-bold text-amber-300 block">💳 Debit Cards</span>
                  <span className="text-stone-400 block">Visa, Mastercard, RuPay, Maestro</span>
                </div>
                <div className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/40 space-y-1">
                  <span className="font-bold text-amber-300 block">🏦 Net Banking &amp; Wallets</span>
                  <span className="text-stone-400 block">SBI, HDFC, ICICI, Axis, 50+ Banks</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-1/3 py-3.5 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={loading}
                className="w-2/3 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {loading ? "Preparing Checkout..." : "Proceed to Payment →"}
              </button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="py-12 text-center space-y-4" aria-live="polite">
            <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-bold text-stone-200">Redirecting to PhonePe Checkout...</p>
            <p className="text-xs text-stone-400">You are being safely redirected to the PhonePe payment page.</p>
          </div>
        )}
      </div>
    </div>
  );
}
