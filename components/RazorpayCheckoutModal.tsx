"use client";

import { useState } from "react";

type RazorpayCheckoutModalProps = {
  enrollment: any;
  dashboardData: any;
  userName: string;
  userPhone: string;
  onClose: () => void;
  onSuccess: (receiptNumber: string) => void;
  onFailure: (errorMessage: string) => void;
};

export function RazorpayCheckoutModal({
  enrollment,
  dashboardData,
  userName,
  userPhone,
  onClose,
  onSuccess,
  onFailure,
}: RazorpayCheckoutModalProps) {
  const [step, setStep] = useState<"summary" | "processing" | "sandbox_fallback">("summary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sandboxPaymentMethod, setSandboxPaymentMethod] = useState<string>("UPI_PHONEPE");
  const [pendingOrderDetails, setPendingOrderDetails] = useState<any>(null);

  const monthlyAmount = enrollment?.monthlyAmount || dashboardData?.enrollment?.monthlyAmount || 0;
  const nextInstallmentNo = (enrollment?.paidInstallmentCount || dashboardData?.paidInstallmentCount || 0) + 1;
  const totalInstallments = enrollment?.tenureMonths || dashboardData?.totalInstallments || 12;
  const processingFee = 0;
  const totalPayable = monthlyAmount + processingFee;

  const currentGateway = pendingOrderDetails?.gateway || "PHONEPE";

  // Load Razorpay Script dynamically if Razorpay fallback is active
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

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
      // 1. Create Payment Order on Backend
      const orderRes = await fetch(`/api/v1/me/schemes/${enrollment.id}/payments/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error?.message || "Failed to create payment order");
      }

      const { paymentOrderId, gatewayOrderId, amount, keyId, gateway, redirectUrl, merchantTransactionId } = orderData.data;
      setPendingOrderDetails(orderData.data);

      // 1. PhonePe Gateway Handler
      if (gateway === "PHONEPE") {
        if (redirectUrl && redirectUrl.startsWith("http")) {
          setStep("processing");
          window.location.href = redirectUrl;
          return;
        } else {
          setStep("sandbox_fallback");
          setLoading(false);
          return;
        }
      }

      // 2. Razorpay Gateway Handler
      if (gateway === "MOCK" || !keyId || keyId === "mock_key" || keyId.startsWith("mock_")) {
        setStep("sandbox_fallback");
        setLoading(false);
        return;
      }

      // Try loading Razorpay Standard Checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !(window as any).Razorpay) {
        setStep("sandbox_fallback");
        setLoading(false);
        return;
      }

      setStep("processing");

      // 2. Open Razorpay Standard Checkout Popup
      const options = {
        key: keyId,
        amount: Math.round(amount * 100),
        currency: "INR",
        name: "RateStack Savings",
        description: `${enrollment.productName} - Installment #${nextInstallmentNo}`,
        image: "/ratestack-logo.png",
        order_id: gatewayOrderId,
        prefill: {
          name: userName,
          contact: userPhone,
        },
        theme: {
          color: "#d97706",
        },
        handler: async function (response: any) {
          await verifyPaymentOnServer({
            paymentOrderId,
            gatewayPaymentId: response.razorpay_payment_id,
            gatewaySignature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setStep("summary");
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on("payment.failed", function (response: any) {
        onFailure(response.error?.description || "Payment failed at gateway");
      });
      razorpayInstance.open();
    } catch (err: any) {
      setError(err.message || "Failed to launch payment checkout");
      setLoading(false);
      setStep("summary");
    }
  };

  const verifyPaymentOnServer = async (payload: {
    paymentOrderId: string;
    gatewayPaymentId?: string;
    gatewaySignature?: string;
    merchantTransactionId?: string;
  }) => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
    try {
      const verifyRes = await fetch(`/api/v1/me/schemes/${enrollment.id}/payments/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        onSuccess(verifyData.data.receiptNumber || "RCP-2026-SUCCESS");
      } else {
        throw new Error(verifyData.error?.message || "Payment verification failed");
      }
    } catch (err: any) {
      onFailure(err.message || "Payment verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSandboxFallback = async (status: "SUCCESS" | "FAILED") => {
    if (!pendingOrderDetails) return;

    if (status === "FAILED") {
      onFailure("Payment failed by customer in Sandbox checkout simulator.");
      return;
    }

    if (currentGateway === "PHONEPE") {
      await verifyPaymentOnServer({
        paymentOrderId: pendingOrderDetails.paymentOrderId,
        merchantTransactionId: pendingOrderDetails.merchantTransactionId || pendingOrderDetails.gatewayOrderId,
        gatewayPaymentId: `PP_TX_SANDBOX_${Date.now()}`,
        gatewaySignature: "PHONEPE_VERIFIED",
      });
    } else {
      await verifyPaymentOnServer({
        paymentOrderId: pendingOrderDetails.paymentOrderId,
        gatewayPaymentId: `pay_rzp_test_${Date.now()}`,
        gatewaySignature: "mock_valid_signature",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4 text-stone-100 font-sans">
      <div className="w-full max-w-lg rounded-3xl bg-stone-900 border border-amber-500/30 p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-stone-800 pb-4">
          <div>
            <span className="text-[0.68rem] font-bold text-amber-400 uppercase tracking-widest block">
              {currentGateway === "PHONEPE" ? "PhonePe Payment Gateway Checkout Flow" : "Razorpay Payment Gateway Checkout Flow"}
            </span>
            <h2 className="font-display text-xl font-bold text-stone-100 mt-0.5">
              Installment Payment Summary
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 grid place-items-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs font-bold text-red-300">
            ⚠️ {error}
          </div>
        )}

        {step === "summary" && (
          <div className="space-y-6">
            {/* Installment Summary Details */}
            <div className="rounded-2xl bg-stone-950/80 border border-stone-800 p-5 space-y-3 text-xs">
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
              <div className="flex justify-between items-center border-t border-stone-800 pt-3 text-sm">
                <span className="font-bold text-stone-200">Total Payable Amount:</span>
                <span className="font-extrabold text-amber-300 text-lg">₹{totalPayable.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Supported Payment Methods Display */}
            <div className="space-y-2">
              <span className="text-[0.7rem] font-bold text-stone-400 uppercase tracking-wider block">
                Available Payment Options ({currentGateway === "PHONEPE" ? "PhonePe Standard Checkout" : "Razorpay Standard Checkout"}):
              </span>
              <div className="grid grid-cols-2 gap-2 text-[0.7rem]">
                <div className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/40 space-y-1">
                  <span className="font-bold text-amber-300 block">📱 1. UPI Payment Apps</span>
                  <span className="text-stone-400 block">PhonePe, Google Pay, Paytm, BHIM, Any UPI</span>
                </div>
                <div className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/40 space-y-1">
                  <span className="font-bold text-amber-300 block">💳 2. Credit Cards</span>
                  <span className="text-stone-400 block">Visa, Mastercard, RuPay, Amex</span>
                </div>
                <div className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/40 space-y-1">
                  <span className="font-bold text-amber-300 block">💳 3. Debit Cards</span>
                  <span className="text-stone-400 block">Visa, Mastercard, RuPay, Maestro</span>
                </div>
                <div className="p-2.5 rounded-xl border border-stone-800 bg-stone-950/40 space-y-1">
                  <span className="font-bold text-amber-300 block">🏦 4. Net Banking &amp; Wallets</span>
                  <span className="text-stone-400 block">SBI, HDFC, ICICI, Axis, 50+ Banks</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3 pt-2">
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
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin mx-auto" />
            <p className="text-sm font-bold text-stone-200">
              {currentGateway === "PHONEPE" ? "Redirecting to PhonePe Checkout..." : "Awaiting Razorpay Checkout Response..."}
            </p>
            <p className="text-xs text-stone-400">
              {currentGateway === "PHONEPE"
                ? "You are being safely redirected to PhonePe payment page."
                : "Please complete the payment in the Razorpay Checkout window."}
            </p>
          </div>
        )}

        {step === "sandbox_fallback" && (
          <div className="space-y-5 text-xs">
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 text-amber-300 font-semibold space-y-1">
              <span className="font-bold block">
                {currentGateway === "PHONEPE" ? "PhonePe Sandbox Payment Simulator" : "Razorpay Sandbox Simulator"}
              </span>
              <p className="text-[0.7rem] text-stone-300">
                You are testing in Sandbox Mode. Select a simulated test payment method below to execute verified payment processing.
              </p>
            </div>

            <div>
              <label className="block font-bold text-stone-300 mb-1">Choose Test Payment Method:</label>
              <select
                value={sandboxPaymentMethod}
                onChange={(e) => setSandboxPaymentMethod(e.target.value)}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
              >
                <option value="UPI_PHONEPE">PhonePe UPI (Test Success)</option>
                <option value="UPI_GPAY">Google Pay UPI (Test Success)</option>
                <option value="UPI_PAYTM">Paytm UPI (Test Success)</option>
                <option value="CARD_CREDIT">Credit Card — Visa/Mastercard (Test Success)</option>
                <option value="CARD_DEBIT">Debit Card — RuPay (Test Success)</option>
                <option value="NETBANKING_SBI">Net Banking — State Bank of India (Test Success)</option>
                <option value="NETBANKING_HDFC">Net Banking — HDFC Bank (Test Success)</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleExecuteSandboxFallback("FAILED")}
                disabled={loading}
                className="w-1/2 py-3 rounded-xl border border-red-500/30 bg-red-950/30 text-red-300 font-bold text-xs hover:bg-red-900/40"
              >
                Simulate Payment Failure
              </button>
              <button
                type="button"
                onClick={() => handleExecuteSandboxFallback("SUCCESS")}
                disabled={loading}
                className="w-1/2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg"
              >
                {loading ? "Verifying..." : "Simulate Payment Success →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
