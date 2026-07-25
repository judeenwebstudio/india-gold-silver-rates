"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function UserSchemeDashboardPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = use(params);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Receipt Modal State
  const [receiptModalData, setReceiptModalData] = useState<any>(null);

  const loadDashboard = () => {
    const token = localStorage.getItem("ratestack_user_token");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`/api/v1/me/schemes/${enrollmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.error?.message || "Failed to load dashboard");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, [enrollmentId]);

  const handlePayInstallment = async () => {
    const token = localStorage.getItem("ratestack_user_token");
    if (!token) return;

    setError(null);
    setPaying(true);

    try {
      // 1. Create Payment Order
      const orderRes = await fetch(`/api/v1/me/schemes/${enrollmentId}/payments/order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gateway: "RAZORPAY" }),
      });

      const orderData = await orderRes.json();
      if (!orderData.success) {
        throw new Error(orderData.error?.message || "Failed to initiate payment");
      }

      // 2. Verify Payment (Using Sandbox or Mock for Dev)
      const verifyRes = await fetch(`/api/v1/me/schemes/${enrollmentId}/payments/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentOrderId: orderData.data.paymentOrderId,
          gatewayPaymentId: `pay_sandbox_${Date.now()}`,
          gatewaySignature: "mock_valid_signature",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error(verifyData.error?.message || "Payment verification failed");
      }

      // Refresh dashboard
      loadDashboard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  const handleViewReceipt = async (receiptId: string) => {
    const token = localStorage.getItem("ratestack_user_token");
    if (!token) return;

    try {
      const res = await fetch(`/api/v1/me/schemes/${enrollmentId}/receipts/${receiptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (resData.success) {
        setReceiptModalData(resData.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans grid place-items-center">
        <p className="animate-pulse text-stone-500 font-medium">Loading scheme purchase dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans">
        <Header />
        <main className="mx-auto max-w-xl py-20 text-center px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 text-sm font-bold">
            ⚠️ {error || "Scheme dashboard not found. Please log in first."}
          </div>
          <div className="mt-6">
            <Link href="/schemes" className="text-xs font-bold text-amber-800 underline">
              &larr; Return to Scheme Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans">
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Account Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300/50">
                Account #{data.accountNumber}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  data.status === "MATURED"
                    ? "bg-emerald-100 text-emerald-800"
                    : data.status === "ACTIVE"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-stone-200 text-stone-800"
                }`}
              >
                {data.status}
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-stone-900 mt-2">{data.productName}</h1>
          </div>

          <div className="flex gap-3">
            {data.status === "MATURED" && (
              <Link
                href={`/schemes/redemption/${data.id}`}
                className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 text-sm shadow-sm transition-all"
              >
                Request Redemption &rarr;
              </Link>
            )}

            {data.status === "ACTIVE" && (
              <button
                type="button"
                onClick={handlePayInstallment}
                disabled={paying}
                className="rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold px-5 py-2.5 text-sm shadow-sm transition-all"
              >
                {paying ? "Processing Payment..." : "Pay Due Installment (₹" + data.monthlyAmount.toLocaleString("en-IN") + ")"}
              </button>
            )}
          </div>
        </div>

        {/* Primary Metric Grid - Terminology: Scheme Purchase Balance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
            <span className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
              Scheme Purchase Balance
            </span>
            <span className="font-display font-extrabold text-2xl text-amber-950 mt-1 block">
              ₹{data.schemePurchaseBalance.toLocaleString("en-IN")}
            </span>
            <span className="text-[0.65rem] font-semibold text-amber-700 block mt-1">
              Eligible Purchase Value for Coin
            </span>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider">
              Total Scheduled Savings
            </span>
            <span className="font-display font-extrabold text-xl text-stone-900 mt-1 block">
              ₹{data.totalScheduledAmount.toLocaleString("en-IN")}
            </span>
            <span className="text-[0.65rem] font-semibold text-stone-500 block mt-1">
              Remaining: ₹{data.remainingAmount.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider">
              Installment Progress
            </span>
            <span className="font-display font-extrabold text-xl text-stone-900 mt-1 block">
              {data.paidInstallmentCount} / {data.tenureMonths} Paid
            </span>
            <span className="text-[0.65rem] font-semibold text-stone-500 block mt-1">
              {data.remainingInstallmentCount} Remaining
            </span>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider">
              Next Due Date
            </span>
            <span className="font-display font-extrabold text-xl text-stone-900 mt-1 block">
              {data.nextDueDate ? new Date(data.nextDueDate).toLocaleDateString("en-IN") : "Matured"}
            </span>
            <span className="text-[0.65rem] font-semibold text-stone-500 block mt-1">
              Maturity: {new Date(data.maturityDate).toLocaleDateString("en-IN")}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-stone-700">
            <span>Overall Scheme Completion</span>
            <span>{data.progressPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data.progressPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Timeline & Receipts */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Installment Schedule Timeline */}
          <div className="md:col-span-2 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-stone-900 text-lg">Installment Schedule Timeline</h2>
            <div className="divide-y divide-stone-100">
              {data.installments.map((inst: any) => (
                <div key={inst.id} className="py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full grid place-items-center text-xs font-bold ${
                        inst.status === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {inst.installmentNo}
                    </span>
                    <div>
                      <span className="font-semibold text-stone-800">
                        Installment #{inst.installmentNo}
                      </span>
                      <span className="block text-xs text-stone-500">
                        Due: {new Date(inst.dueDate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-stone-900">₹{inst.amount.toLocaleString("en-IN")}</span>
                    <span
                      className={`block text-xs font-bold ${
                        inst.status === "PAID" ? "text-emerald-700" : "text-amber-800"
                      }`}
                    >
                      {inst.status === "PAID" ? `Paid on ${new Date(inst.paidAt).toLocaleDateString("en-IN")}` : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Receipts */}
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-bold text-stone-900 text-lg">Payment Receipts</h2>
            {data.recentReceipts.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No receipts generated yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentReceipts.map((r: any) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border border-stone-100 bg-stone-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-stone-800 block">{r.receiptNumber}</span>
                      <span className="text-stone-500 block">
                        {new Date(r.paymentDate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleViewReceipt(r.id)}
                      className="px-3 py-1 rounded-lg bg-white border border-stone-200 text-amber-800 font-bold hover:bg-amber-50"
                    >
                      View Receipt &rarr;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Receipt View Modal */}
      {receiptModalData && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-bold text-stone-900 text-base">Official Payment Receipt</h3>
              <button
                onClick={() => setReceiptModalData(null)}
                className="text-stone-400 font-bold hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Receipt Number:</span>
                <span className="font-bold">{receiptModalData.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Date:</span>
                <span>{new Date(receiptModalData.paymentDate).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-extrabold text-amber-900 text-sm">
                  ₹{receiptModalData.amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Scheme Account:</span>
                <span>{receiptModalData.accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Product Name:</span>
                <span>{receiptModalData.productName}</span>
              </div>
              <div className="flex justify-between">
                <span>Member Name:</span>
                <span>{receiptModalData.userName}</span>
              </div>
              <div className="pt-3 border-t border-stone-200">
                <span className="block font-bold text-stone-900 mb-1">Merchant Information:</span>
                <span className="block">{receiptModalData.merchantDetails.sellerName}</span>
                <span className="block text-stone-500">GSTIN: {receiptModalData.merchantDetails.gstin}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-700 text-white font-bold rounded-xl text-xs hover:bg-amber-800"
              >
                Print / Save Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
