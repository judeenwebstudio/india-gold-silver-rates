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

  // Redemption State
  const [selectedDenominationId, setSelectedDenominationId] = useState<string>("");
  const [collectionMethod, setCollectionMethod] = useState<"SHOWROOM_PICKUP" | "HOME_DELIVERY">("SHOWROOM_PICKUP");
  const [quotation, setQuotation] = useState<any>(null);
  const [quoting, setQuoting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submittingRedemption, setSubmittingRedemption] = useState(false);
  const [redemptionSuccessMsg, setRedemptionSuccessMsg] = useState<string | null>(null);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
  };

  const loadDashboard = () => {
    const token = getToken();
    if (!token) {
      setError("Please sign in to access your scheme dashboard.");
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
          if (res.data.schemePlan?.coinDenominations?.length > 0) {
            setSelectedDenominationId(res.data.schemePlan.coinDenominations[0].id);
          }
        } else {
          setError(res.error?.message || "Failed to load scheme dashboard");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, [enrollmentId]);

  const handlePayInstallment = async () => {
    const token = getToken();
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

      // 2. Verify Payment (Sandbox)
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

      loadDashboard();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  const handleViewReceipt = async (receiptId: string) => {
    const token = getToken();
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

  const handleGenerateQuotation = async () => {
    const token = getToken();
    if (!token || !selectedDenominationId) return;

    setQuoting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/me/schemes/${enrollmentId}/redemption/quotation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          denominationId: selectedDenominationId,
          collectionMethod,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setQuotation(resData.data);
      } else {
        throw new Error(resData.error?.message || "Failed to generate quotation");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQuoting(false);
    }
  };

  const handleAcceptQuotation = async () => {
    const token = getToken();
    if (!token || !quotation) return;

    setSubmittingRedemption(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/me/schemes/${enrollmentId}/redemption/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quotationId: quotation.quotationId,
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        setRedemptionSuccessMsg("Redemption request submitted successfully! Order reference: " + resData.data.redemptionRequestId);
        loadDashboard();
      } else {
        throw new Error(resData.error?.message || "Failed to submit redemption");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingRedemption(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 font-sans grid place-items-center">
        <p className="animate-pulse text-amber-400 font-medium text-sm">Loading your scheme purchase dashboard...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col">
        <Header />
        <main className="mx-auto max-w-xl py-20 text-center px-4 flex-1">
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6 text-red-400 text-sm font-bold">
            ⚠️ {error || "Scheme dashboard not found. Please log in first."}
          </div>
          <div className="mt-6">
            <Link href="/schemes" className="text-xs font-bold text-amber-400 underline">
              &larr; Return to Scheme Products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const enrollment = data.enrollment;
  const isGold = enrollment.metalType === "GOLD";
  const rateInfo = data.relevantCurrentMetalRate;
  const nextInst = data.nextInstallment;
  const redemptionEligible = data.redemptionEligibility?.isEligible;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col">
      <Header />

      <main className="max-w-6xl w-full mx-auto px-4 py-8 space-y-8 flex-1">
        {/* Account Banner */}
        <div
          className={`rounded-3xl border p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl ${
            isGold
              ? "border-amber-500/30 bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900"
              : "border-slate-700/50 bg-gradient-to-r from-stone-900 via-slate-900/60 to-stone-900"
          }`}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 px-3 py-1 text-xs font-mono font-bold">
                Account #{enrollment.accountNumber}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  enrollment.status === "MATURED"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : enrollment.status === "ACTIVE"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-stone-800 text-stone-300"
                }`}
              >
                {enrollment.status}
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-stone-100">{enrollment.productName}</h1>
            <p className="text-xs text-stone-400 mt-1">
              Started {new Date(enrollment.startDate).toLocaleDateString("en-IN")} • Maturity {new Date(enrollment.maturityDate).toLocaleDateString("en-IN")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {enrollment.status === "ACTIVE" && (
              <button
                type="button"
                onClick={handlePayInstallment}
                disabled={paying}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
              >
                {paying ? "Processing..." : `Pay Installment (₹${enrollment.monthlyAmount.toLocaleString("en-IN")})`}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs font-bold text-red-300">
            ⚠️ {error}
          </div>
        )}

        {redemptionSuccessMsg && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-bold text-emerald-300">
            ✅ {redemptionSuccessMsg}
          </div>
        )}

        {/* Primary Metric Grid - Terminology: Scheme Purchase Balance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-stone-900 to-amber-950/30 p-5 space-y-1 shadow-lg">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Scheme Purchase Balance
            </span>
            <span className="font-display font-extrabold text-2xl md:text-3xl text-amber-100 block">
              ₹{data.schemePurchaseBalance.toLocaleString("en-IN")}
            </span>
            <span className="text-[0.68rem] text-amber-300/80 block pt-1">
              Verified Eligible Purchase Value
            </span>
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 space-y-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Amount Paid
            </span>
            <span className="font-display font-extrabold text-2xl text-stone-100 block">
              ₹{data.verifiedContributionTotal.toLocaleString("en-IN")}
            </span>
            <span className="text-[0.68rem] text-stone-400 block pt-1">
              {data.paidInstallmentCount} of {data.totalInstallments} Installments Paid
            </span>
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 space-y-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Amount Remaining
            </span>
            <span className="font-display font-extrabold text-2xl text-stone-100 block">
              ₹{data.remainingScheduledAmount.toLocaleString("en-IN")}
            </span>
            <span className="text-[0.68rem] text-stone-400 block pt-1">
              {data.remainingInstallmentCount === 0 ? "All scheduled installments completed" : `${data.remainingInstallmentCount} Installments Remaining`}
            </span>
          </div>

          <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 space-y-1">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
              Next Installment Due
            </span>
            <span className="font-display font-extrabold text-xl text-stone-100 block">
              {nextInst ? new Date(nextInst.dueDate).toLocaleDateString("en-IN") : "Completed"}
            </span>
            {nextInst && (
              <span
                className={`inline-block text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase mt-1 ${
                  nextInst.statusTag === "OVERDUE"
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : nextInst.statusTag === "DUE_TODAY"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {nextInst.statusTag.replace("_", " ")}
              </span>
            )}
          </div>
        </div>

        {/* Benchmark Rate & Accessible Progress Bar */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Today's Benchmark Metal Price */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Today's Benchmark Rate
              </span>
              <span className="text-[0.65rem] text-stone-400">Live Source</span>
            </div>
            {rateInfo ? (
              <div className="space-y-1">
                <span className="text-xs text-stone-400 block">
                  {rateInfo.metalType === "GOLD" ? "22K Gold (916 Pure)" : "Silver 999 Fine"}
                </span>
                <span className="font-display font-extrabold text-2xl text-amber-100 block">
                  ₹{rateInfo.pricePerGramInr.toLocaleString("en-IN")} <span className="text-xs font-normal text-stone-400">/ gram</span>
                </span>
                {rateInfo.pricePerKgInr && (
                  <span className="text-xs text-stone-400 block pt-1">
                    ₹{rateInfo.pricePerKgInr.toLocaleString("en-IN")} / kg
                  </span>
                )}
                <span className="text-[0.65rem] text-stone-500 block pt-1">
                  Source: {rateInfo.source} • Recorded {new Date(rateInfo.recordedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ) : (
              <p className="text-xs text-stone-500">Benchmark rate update pending...</p>
            )}
          </div>

          {/* Savings Progress Card */}
          <div className="md:col-span-2 rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Verified Savings Progress
                </span>
                <span className="font-bold text-amber-400 text-sm">{data.progressPercent}%</span>
              </div>
              <div className="h-3 w-full bg-stone-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    isGold ? "bg-gradient-to-r from-amber-600 to-amber-400" : "bg-gradient-to-r from-slate-500 to-slate-300"
                  }`}
                  style={{ width: `${Math.min(100, data.progressPercent)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-stone-800">
              <div>
                <span className="text-stone-500 block">Paid</span>
                <span className="font-bold text-emerald-400">{data.paidInstallmentCount}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Total</span>
                <span className="font-bold text-stone-200">{data.totalInstallments}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Remaining</span>
                <span className="font-bold text-amber-300">{data.remainingInstallmentCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline & Receipts */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Installment Schedule Timeline */}
          <div className="md:col-span-2 rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-4">
            <h2 className="font-bold text-stone-100 text-base">Installment Schedule Timeline</h2>
            <div className="divide-y divide-stone-800">
              {data.installments.map((inst: any) => (
                <div key={inst.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full grid place-items-center font-bold text-[0.65rem] ${
                        inst.status === "PAID"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-stone-800 text-stone-400"
                      }`}
                    >
                      {inst.installmentNo}
                    </span>
                    <div>
                      <span className="font-semibold text-stone-200 block">
                        Installment #{inst.installmentNo}
                      </span>
                      <span className="text-stone-500 block">
                        Due: {new Date(inst.dueDate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-stone-100 block">₹{inst.amount.toLocaleString("en-IN")}</span>
                    <span
                      className={`text-[0.65rem] font-bold ${
                        inst.status === "PAID" ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {inst.status === "PAID" ? `Paid ${new Date(inst.paidAt).toLocaleDateString("en-IN")}` : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Receipts */}
          <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-4">
            <h2 className="font-bold text-stone-100 text-base">Payment Receipts</h2>
            {data.recentReceipts.length === 0 ? (
              <p className="text-xs text-stone-500 italic">No receipts generated yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentReceipts.map((r: any) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-xl border border-stone-800 bg-stone-950/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-amber-300 block">{r.receiptNumber}</span>
                      <span className="text-stone-400 block text-[0.65rem]">
                        {new Date(r.paymentDate).toLocaleDateString("en-IN")} • ₹{r.amount.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleViewReceipt(r.id)}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 font-bold border border-amber-500/20 text-[0.7rem]"
                    >
                      View &rarr;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment History & Retry Section */}
        <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-4">
          <h2 className="font-bold text-stone-100 text-base">Payment History</h2>
          {data.recentPayments.length === 0 ? (
            <p className="text-xs text-stone-500 italic">No transaction history recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-500 font-bold uppercase tracking-wider">
                    <th className="p-3">Order Ref</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Gateway</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-stone-300">
                  {data.recentPayments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="p-3 font-mono text-stone-400">{p.orderId}</td>
                      <td className="p-3 font-bold text-stone-100">₹{p.amount.toLocaleString("en-IN")}</td>
                      <td className="p-3">{p.gateway}</td>
                      <td className="p-3">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[0.65rem] font-bold ${
                            p.status === "SUCCESS"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : p.status === "FAILED" || p.status === "EXPIRED"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {p.retryable ? (
                          <button
                            type="button"
                            onClick={handlePayInstallment}
                            disabled={paying}
                            className="px-3 py-1 rounded bg-amber-500 text-stone-950 font-bold text-[0.7rem] hover:bg-amber-400"
                          >
                            Retry Payment
                          </button>
                        ) : (
                          <span className="text-stone-600 text-[0.7rem]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Redeem Coin Section */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-stone-900 to-amber-950/20 p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                Maturity Coin Redemption
              </span>
              <h2 className="font-display text-xl font-bold text-amber-100">
                Redeem {isGold ? "22K Gold Coin" : "Silver 999 Coin"}
              </h2>
            </div>
            {!redemptionEligible && (
              <span className="px-3 py-1.5 rounded-xl bg-stone-800 text-amber-400 text-xs font-bold border border-amber-500/20">
                {data.redemptionEligibility.reasonIfNotEligible}
              </span>
            )}
          </div>

          {!redemptionEligible ? (
            <div className="bg-stone-950/60 p-6 rounded-2xl border border-stone-800 text-center space-y-2">
              <p className="text-xs text-stone-300 font-semibold">
                🔒 Redemption will unlock automatically after full maturity on{" "}
                <span className="text-amber-300 font-bold">
                  {new Date(enrollment.maturityDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </p>
              <p className="text-[0.7rem] text-stone-500">
                Keep saving monthly to build your Eligible Purchase Value.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Denomination & Pickup Selection */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-2">
                    Select Allowed Coin Denomination ({isGold ? "22K Gold" : "Silver 999"} only):
                  </label>
                  <select
                    value={selectedDenominationId}
                    onChange={(e) => setSelectedDenominationId(e.target.value)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-xs text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
                  >
                    {data.schemePlan.coinDenominations.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.weightGrams}g) — Minting Fee: ₹{d.mintingFee}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-2">
                    Fulfilment Method:
                  </label>
                  <select
                    value={collectionMethod}
                    onChange={(e: any) => setCollectionMethod(e.target.value)}
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-xs text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="SHOWROOM_PICKUP">Showroom Collection (Free)</option>
                    <option value="HOME_DELIVERY">Insured Home Delivery (₹250)</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateQuotation}
                disabled={quoting || !selectedDenominationId}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
              >
                {quoting ? "Calculating Quotation..." : "Generate Live Server Quotation &rarr;"}
              </button>

              {/* Server Quotation Breakdown */}
              {quotation && (
                <div className="bg-stone-950 p-6 rounded-2xl border border-amber-500/40 space-y-4">
                  <div className="flex justify-between items-center border-b border-stone-800 pb-3">
                    <span className="font-mono text-xs text-amber-400">Quote #{quotation.quotationNumber}</span>
                    <span className="text-[0.65rem] text-stone-400">
                      Expires: {new Date(quotation.validUntil).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-stone-300">
                    <div className="flex justify-between">
                      <span>Rate Snapshot ({quotation.rateSource}):</span>
                      <span className="font-bold">₹{quotation.ratePerGramInr.toLocaleString("en-IN")} / gram</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Metal Value ({quotation.selectedWeightGrams}g):</span>
                      <span className="font-bold">₹{quotation.metalValueInr.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minting &amp; Packaging Charges:</span>
                      <span>₹{(quotation.mintingChargesInr + quotation.packagingChargesInr).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Statutory GST (3%):</span>
                      <span>₹{quotation.gstAmountInr.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery Charges:</span>
                      <span>₹{quotation.deliveryChargesInr.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between font-bold text-stone-100 pt-2 border-t border-stone-800">
                      <span>Total Gross Order Value:</span>
                      <span>₹{quotation.totalGrossValueInr.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Scheme Purchase Balance Applied:</span>
                      <span>- ₹{quotation.eligibleBalanceAppliedInr.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-amber-300 font-extrabold text-sm pt-2 border-t border-stone-800">
                      <span>Net Difference Payable:</span>
                      <span>₹{quotation.netDifferencePayableInr.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="acceptTerms" className="text-xs text-stone-300">
                      I accept the live quotation, charges breakdown, and legal terms.
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleAcceptQuotation}
                    disabled={!acceptedTerms || submittingRedemption}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
                  >
                    {submittingRedemption ? "Submitting Request..." : "Confirm & Submit Redemption Order &rarr;"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Receipt View Modal */}
      {receiptModalData && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-stone-900 border border-stone-800 p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-bold text-stone-100 text-base">Official Payment Receipt</h3>
              <button
                onClick={() => setReceiptModalData(null)}
                className="text-stone-400 font-bold hover:text-stone-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-300">
              <div className="flex justify-between">
                <span>Receipt Number:</span>
                <span className="font-mono font-bold text-amber-300">{receiptModalData.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Date:</span>
                <span>{new Date(receiptModalData.paymentDate).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span className="font-extrabold text-amber-300 text-sm">
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
              <div className="pt-3 border-t border-stone-800 text-[0.7rem] text-stone-400">
                <span className="block font-bold text-stone-200 mb-1">Merchant Information:</span>
                <span className="block">{receiptModalData.merchantDetails.sellerName}</span>
                <span className="block">GSTIN: {receiptModalData.merchantDetails.gstin}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs hover:bg-amber-400"
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
