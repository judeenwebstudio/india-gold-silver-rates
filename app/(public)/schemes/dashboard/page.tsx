"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RazorpayCheckoutModal } from "@/components/RazorpayCheckoutModal";

export default function CustomerSchemesDashboardPage() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [loadingSchemes, setLoadingSchemes] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // User Profile information
  const [userName, setUserName] = useState<string>("Customer");
  const [userPhone, setUserPhone] = useState<string>("");

  // Receipt Modal state
  const [receiptModalData, setReceiptModalData] = useState<any>(null);

  // Redemption Quotation state
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

  const loadUserSchemes = (token: string) => {
    setLoadingSchemes(true);
    setError(null);

    fetch("/api/v1/me/schemes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          const list = res.data || [];
          setSchemes(list);
          if (list.length > 0 && !selectedSchemeId) {
            setSelectedSchemeId(list[0].id);
          }
        } else {
          setError(res.error?.message || "Failed to load user schemes");
        }
      })
      .catch(() => setError("Network error loading schemes"))
      .finally(() => setLoadingSchemes(false));
  };

  const loadSchemeDashboard = (token: string, enrollmentId: string) => {
    setLoadingDashboard(true);
    setQuotation(null);
    setRedemptionSuccessMsg(null);

    fetch(`/api/v1/me/schemes/${enrollmentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setDashboardData(res.data);
          if (res.data.schemePlan?.coinDenominations?.length > 0) {
            setSelectedDenominationId(res.data.schemePlan.coinDenominations[0].id);
          }
        } else {
          setError(res.error?.message || "Failed to load scheme details");
        }
      })
      .catch(() => setError("Network error loading dashboard metrics"))
      .finally(() => setLoadingDashboard(false));
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setError("Please sign in to view your Customer Savings Dashboard.");
      setLoadingSchemes(false);
      return;
    }

    const savedName = localStorage.getItem("scheme_user_name");
    const savedPhone = localStorage.getItem("scheme_user_phone");
    if (savedName) setUserName(savedName);
    if (savedPhone) setUserPhone(savedPhone);

    loadUserSchemes(token);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token && selectedSchemeId) {
      loadSchemeDashboard(token, selectedSchemeId);
    }
  }, [selectedSchemeId]);

  // Payment modal & result state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccessReceiptNumber, setPaymentSuccessReceiptNumber] = useState<string | null>(null);
  const [paymentFailureError, setPaymentFailureError] = useState<string | null>(null);

  const handleOpenPaymentModal = () => {
    setError(null);
    setPaymentSuccessReceiptNumber(null);
    setPaymentFailureError(null);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (receiptNumber: string) => {
    setShowPaymentModal(false);
    setPaymentSuccessReceiptNumber(receiptNumber);
    const token = getToken();
    if (token) {
      loadUserSchemes(token);
      if (selectedSchemeId) loadSchemeDashboard(token, selectedSchemeId);
    }
  };

  const handlePaymentFailure = (errorMessage: string) => {
    setShowPaymentModal(false);
    setPaymentFailureError(errorMessage);
  };

  const handleViewReceipt = async (receiptId: string) => {
    const token = getToken();
    if (!token || !selectedSchemeId) return;

    try {
      const res = await fetch(`/api/v1/me/schemes/${selectedSchemeId}/receipts/${receiptId}`, {
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
    if (!token || !selectedSchemeId || !selectedDenominationId) return;

    setQuoting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/me/schemes/${selectedSchemeId}/redemption/quotation`, {
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
    if (!token || !selectedSchemeId || !quotation) return;

    setSubmittingRedemption(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/me/schemes/${selectedSchemeId}/redemption/accept`, {
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
        setRedemptionSuccessMsg("Redemption order submitted successfully! Ref: " + resData.data.redemptionRequestId);
        loadSchemeDashboard(token, selectedSchemeId);
      } else {
        throw new Error(resData.error?.message || "Failed to submit redemption");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingRedemption(false);
    }
  };

  const handleDownloadStatement = () => {
    window.print();
  };

  const activeScheme = schemes.find((s) => s.id === selectedSchemeId);
  const isGoldScheme = activeScheme?.metalType === "GOLD" || dashboardData?.enrollment?.metalType === "GOLD";

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Header */}
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
              RateStack Premium Jewellery Savings
            </span>
            <h1 className="font-display text-2xl md:text-4xl font-extrabold text-amber-100 tracking-tight">
              Customer Savings Dashboard
            </h1>
            <p className="text-xs md:text-sm text-stone-300 mt-1 max-w-xl">
              Track verified Scheme Purchase Balance, instant installment payments, official receipts, and physical coin redemptions.
            </p>
          </div>
          <Link
            href="/schemes"
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all shrink-0"
          >
            + Enroll In New Scheme &rarr;
          </Link>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs font-bold text-red-300">
            ⚠️ {error}
          </div>
        )}

        {redemptionSuccessMsg && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs font-bold text-emerald-300">
            ✅ {redemptionSuccessMsg}
          </div>
        )}

        {loadingSchemes ? (
          <div className="py-20 text-center text-stone-500 animate-pulse text-sm">
            Loading your scheme accounts...
          </div>
        ) : schemes.length === 0 ? (
          <div className="rounded-3xl border border-stone-800 bg-stone-900/60 p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center mx-auto text-amber-400 text-2xl font-bold">
              🪙
            </div>
            <h2 className="text-lg font-bold text-stone-200">No Active Scheme Accounts Joined Yet</h2>
            <p className="text-xs text-stone-400 max-w-md mx-auto">
              Start saving for 22K Gold or 999 Silver coins in flexible monthly installments with RateStack.
            </p>
            <Link
              href="/schemes"
              className="inline-block px-6 py-3 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs hover:bg-amber-400 transition-colors"
            >
              Browse Gold &amp; Silver Schemes
            </Link>
          </div>
        ) : (
          <>
            {/* Scheme Selector Pills */}
            <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-none">
              {schemes.map((s) => {
                const isSelected = s.id === selectedSchemeId;
                const isGold = s.metalType === "GOLD";
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSchemeId(s.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? isGold
                          ? "bg-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/20"
                          : "bg-slate-300 text-slate-950 border-slate-200 shadow-lg shadow-slate-300/20"
                        : "bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700"
                    }`}
                  >
                    <span>{s.productName}</span>
                    <span className={`text-[0.65rem] px-2 py-0.5 rounded-full ${isSelected ? "bg-stone-950 text-white" : "bg-stone-800 text-stone-400"}`}>
                      #{s.accountNumber}
                    </span>
                  </button>
                );
              })}
            </div>

            {loadingDashboard || !dashboardData ? (
              <div className="py-20 text-center text-stone-500 animate-pulse text-sm">
                Loading scheme details...
              </div>
            ) : (
              <div className="space-y-8">
                {/* 8. QUICK ACTIONS */}
                <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Quick Actions:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={handleOpenPaymentModal} className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors">
                      💳 Pay Installment
                    </button>
                    <a href="#payment-history" className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-700 transition-colors">
                      📜 Payment History
                    </a>
                    <a href="#receipts" className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs border border-stone-700 transition-colors">
                      🧾 Receipts
                    </a>
                    <button onClick={handleDownloadStatement} className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs border border-stone-700 transition-colors">
                      📥 Download Statement
                    </button>
                    <a href="#profile" className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs border border-stone-700 transition-colors">
                      👤 Update Profile
                    </a>
                  </div>
                </div>

                {/* 1. MY SCHEME DETAILS CARD */}
                <div
                  className={`rounded-3xl border p-6 md:p-8 space-y-6 shadow-xl ${
                    isGoldScheme
                      ? "border-amber-500/30 bg-gradient-to-br from-stone-900 via-amber-950/20 to-stone-900"
                      : "border-slate-700/50 bg-gradient-to-br from-stone-900 via-slate-900/30 to-stone-900"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                    <div>
                      <span className={`inline-block px-3 py-1 rounded-full text-[0.68rem] font-extrabold uppercase tracking-wider mb-2 ${
                        isGoldScheme ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-slate-700/40 text-slate-300 border border-slate-600/30"
                      }`}>
                        {dashboardData.schemePlan?.title || "Scheme Account"}
                      </span>
                      <h2 className="font-display text-2xl font-extrabold text-stone-100">
                        {dashboardData.enrollment?.productName}
                      </h2>
                      <p className="font-mono text-xs font-bold text-amber-400 mt-0.5">
                        Scheme Account Number: {dashboardData.enrollment?.accountNumber}
                      </p>
                    </div>

                    <span className={`px-4 py-1.5 rounded-xl text-xs font-extrabold border ${
                      dashboardData.enrollment?.status === "ACTIVE"
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/40"
                        : "bg-amber-950/40 text-amber-300 border-amber-500/40"
                    }`}>
                      Scheme Status: {dashboardData.enrollment?.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                      <span className="text-stone-500 block">Monthly Installment</span>
                      <span className="font-extrabold text-stone-100 text-base">₹{(dashboardData.enrollment?.monthlyAmount || 0).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                      <span className="text-stone-500 block">Scheme Duration</span>
                      <span className="font-extrabold text-stone-100 text-base">{dashboardData.enrollment?.tenureMonths} Months</span>
                    </div>
                    <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                      <span className="text-stone-500 block">Scheme Start Date</span>
                      <span className="font-bold text-stone-200">{new Date(dashboardData.enrollment?.startDate).toLocaleDateString("en-IN")}</span>
                    </div>
                    <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                      <span className="text-stone-500 block">Scheme Maturity Date</span>
                      <span className="font-bold text-amber-300">{new Date(dashboardData.enrollment?.maturityDate).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                {/* 2. PAYMENT SUMMARY CARDS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-5 space-y-1">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Total Scheme Amount</span>
                    <span className="font-display font-extrabold text-2xl text-stone-100 block">
                      ₹{(dashboardData.scheduledTotal || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[0.68rem] text-stone-500 block">Committed Plan Total</span>
                  </div>

                  <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-stone-900 to-amber-950/30 p-5 space-y-1 shadow-lg">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">Total Amount Paid</span>
                    <span className="font-display font-extrabold text-2xl text-amber-100 block">
                      ₹{(dashboardData.verifiedContributionTotal || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[0.68rem] text-amber-300/80 block">Verified Purchase Balance</span>
                  </div>

                  <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-5 space-y-1">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Remaining Balance</span>
                    <span className="font-display font-extrabold text-2xl text-stone-100 block">
                      ₹{(dashboardData.remainingScheduledAmount || 0).toLocaleString("en-IN")}
                    </span>
                    <span className="text-[0.68rem] text-stone-500 block">Balance to complete</span>
                  </div>

                  <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-5 space-y-1">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Paid Installments</span>
                    <span className="font-display font-extrabold text-xl text-emerald-400 block">
                      {dashboardData.paidInstallmentCount} / {dashboardData.totalInstallments}
                    </span>
                    <span className="text-[0.68rem] text-emerald-400/80 block">Installments Completed</span>
                  </div>

                  <div className="rounded-2xl border border-stone-800 bg-stone-900/90 p-5 space-y-1">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Remaining Tenure</span>
                    <span className="font-display font-extrabold text-xl text-amber-300 block">
                      {dashboardData.remainingInstallmentCount} Months
                    </span>
                    <span className="text-[0.68rem] text-stone-500 block">Remaining Installments</span>
                  </div>
                </div>

                {/* 6. PAYMENT PROGRESS CARD */}
                <div className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 md:p-8 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                        Verified Scheme Progress
                      </span>
                      <h3 className="font-bold text-stone-100 text-lg">
                        {dashboardData.paidInstallmentCount} of {dashboardData.totalInstallments} Installments Completed
                      </h3>
                    </div>
                    <span className="font-display font-extrabold text-3xl text-amber-300">
                      {dashboardData.progressPercent}%
                    </span>
                  </div>

                  <div className="h-4 w-full bg-stone-950 rounded-full p-1 border border-stone-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isGoldScheme ? "bg-gradient-to-r from-amber-600 to-amber-400" : "bg-gradient-to-r from-slate-500 to-slate-300"
                      }`}
                      style={{ width: `${Math.min(100, dashboardData.progressPercent)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-stone-400 pt-2 border-t border-stone-800">
                    <span>Paid: <strong className="text-emerald-400">{dashboardData.paidInstallmentCount} Installments</strong></span>
                    <span>Remaining: <strong className="text-amber-300">{dashboardData.remainingInstallmentCount} Months</strong></span>
                  </div>
                </div>

                {/* 3. NEXT PAYMENT SECTION */}
                <div id="next-payment" className="scroll-mt-24 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-stone-900 via-amber-950/20 to-stone-900 p-6 md:p-8 space-y-4 shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                    <div>
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                        Next Due Installment
                      </span>
                      <h3 className="font-display text-xl font-bold text-stone-100">
                        {dashboardData.nextInstallment ? `Installment Amount: ₹${dashboardData.nextInstallment.amount.toLocaleString("en-IN")}` : "All Scheduled Installments Completed"}
                      </h3>
                    </div>

                    {dashboardData.nextInstallment && (
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-xl text-xs font-extrabold uppercase border ${
                          dashboardData.nextInstallment.statusTag === "OVERDUE"
                            ? "bg-red-500/20 text-red-300 border-red-500/40"
                            : dashboardData.nextInstallment.statusTag === "DUE_TODAY"
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        }`}>
                          Status: {dashboardData.nextInstallment.statusTag.replace("_", " ")}
                        </span>
                      </div>
                    )}
                  </div>

                  {dashboardData.nextInstallment && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      <p className="text-xs text-stone-300">
                        Next Due Date: <strong className="text-amber-300">{new Date(dashboardData.nextInstallment.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenPaymentModal}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
                      >
                        Pay Now (Sandbox) →
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. PAYMENT HISTORY SECTION */}
                <div id="payment-history" className="scroll-mt-24 rounded-3xl border border-stone-800 bg-stone-900/90 p-6 md:p-8 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                    <h3 className="font-bold text-stone-100 text-lg">Payment History</h3>
                    <span className="text-xs text-stone-500">{dashboardData.recentPayments?.length || 0} Transactions</span>
                  </div>

                  {dashboardData.recentPayments?.length === 0 ? (
                    <p className="text-xs text-stone-500 italic py-4 text-center">No payment transactions recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-stone-800 text-stone-500 font-bold uppercase tracking-wider">
                            <th className="p-3">Receipt / Ref</th>
                            <th className="p-3">Payment Date</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Payment Method</th>
                            <th className="p-3">Transaction Reference</th>
                            <th className="p-3">Payment Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60 text-stone-300 font-medium">
                          {dashboardData.recentPayments?.map((p: any) => (
                            <tr key={p.id} className="hover:bg-stone-950/40 transition-colors">
                              <td className="p-3 font-mono text-amber-300 font-bold">{p.receiptNumber || p.orderId}</td>
                              <td className="p-3">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                              <td className="p-3 font-extrabold text-stone-100">₹{p.amount.toLocaleString("en-IN")}</td>
                              <td className="p-3">{p.gateway}</td>
                              <td className="p-3 font-mono text-[0.7rem] text-stone-400">{p.gatewayPaymentId || "N/A"}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded text-[0.65rem] font-bold ${
                                  p.status === "SUCCESS" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : p.status === "FAILED" || p.status === "EXPIRED" ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}>
                                  {p.status === "SUCCESS" ? "Paid" : p.status}
                                </span>
                              </td>
                              <td className="p-3 text-right space-x-2">
                                {p.receiptId && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewReceipt(p.receiptId)}
                                    className="px-3 py-1.5 rounded-lg bg-stone-800 text-amber-300 border border-amber-500/20 text-[0.7rem] font-bold hover:bg-stone-700"
                                  >
                                    View Receipt
                                  </button>
                                )}
                                {p.retryable && (
                                  <button
                                    type="button"
                                    onClick={handleOpenPaymentModal}
                                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold text-[0.7rem] hover:bg-amber-400"
                                  >
                                    Retry Payment
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 5. RECEIPTS SECTION */}
                <div id="receipts" className="scroll-mt-24 rounded-3xl border border-stone-800 bg-stone-900/90 p-6 md:p-8 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                    <h3 className="font-bold text-stone-100 text-lg">Official Receipts</h3>
                    <span className="text-xs text-stone-500">{dashboardData.recentReceipts?.length || 0} Receipts</span>
                  </div>

                  {dashboardData.recentReceipts?.length === 0 ? (
                    <p className="text-xs text-stone-500 italic py-4 text-center">No official receipts generated yet.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {dashboardData.recentReceipts?.map((r: any) => (
                        <div key={r.id} className="p-5 rounded-2xl border border-stone-800 bg-stone-950/60 space-y-3">
                          <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                            <span className="font-mono font-bold text-amber-300 text-sm">{r.receiptNumber}</span>
                            <span className="text-[0.68rem] text-stone-400">{new Date(r.paymentDate).toLocaleDateString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between items-baseline">
                            <span className="text-xs text-stone-400">Amount Paid</span>
                            <span className="font-extrabold text-stone-100 text-lg">₹{r.amount.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-stone-800/60">
                            <button
                              type="button"
                              onClick={() => handleViewReceipt(r.id)}
                              className="flex-1 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 text-center"
                            >
                              View Receipt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleViewReceipt(r.id)}
                              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold text-center"
                            >
                              Download PDF
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 7. REDEEM COIN SECTION */}
                <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-stone-900 to-amber-950/30 p-6 md:p-8 space-y-6 shadow-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                    <div>
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                        Maturity Coin Redemption Engine
                      </span>
                      <h3 className="font-display text-xl font-bold text-amber-100">
                        {isGoldScheme ? "Redeem 22K Gold Coin" : "Redeem Silver 999 Coin"}
                      </h3>
                    </div>

                    {!dashboardData.redemptionEligibility?.isEligible && (
                      <span className="px-3 py-1.5 rounded-xl bg-stone-800 text-amber-400 text-xs font-bold border border-amber-500/20">
                        Redemption Available After Scheme Completion
                      </span>
                    )}
                  </div>

                  {!dashboardData.redemptionEligibility?.isEligible ? (
                    <div className="bg-stone-950/60 p-6 rounded-2xl border border-stone-800 text-center space-y-2">
                      <p className="text-xs text-stone-300 font-semibold">
                        🔒 Redemption unlocks automatically after scheme maturity on{" "}
                        <span className="text-amber-300 font-bold">
                          {new Date(dashboardData.enrollment?.maturityDate || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </p>
                      <p className="text-[0.7rem] text-stone-500">
                        {dashboardData.redemptionEligibility?.reasonIfNotEligible}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-bold text-stone-300 mb-1">Select Allowed Coin Denomination:</label>
                          <select
                            value={selectedDenominationId}
                            onChange={(e) => setSelectedDenominationId(e.target.value)}
                            className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
                          >
                            {dashboardData.schemePlan?.coinDenominations?.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.title} ({d.weightGrams}g) — Minting Fee: ₹{d.mintingFee}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-stone-300 mb-1">Fulfilment Collection Method:</label>
                          <select
                            value={collectionMethod}
                            onChange={(e: any) => setCollectionMethod(e.target.value)}
                            className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
                          >
                            <option value="SHOWROOM_PICKUP">Showroom Pickup (Free)</option>
                            <option value="HOME_DELIVERY">Insured Home Delivery (₹250)</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateQuotation}
                        disabled={quoting || !selectedDenominationId}
                        className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg transition-all disabled:opacity-50"
                      >
                        {quoting ? "Generating Live Quotation..." : isGoldScheme ? "Redeem Gold Coin →" : "Redeem Silver Coin →"}
                      </button>

                      {quotation && (
                        <div className="bg-stone-950 p-6 rounded-2xl border border-amber-500/40 space-y-4 text-xs">
                          <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                            <span className="font-mono font-bold text-amber-400">Quote #{quotation.quotationNumber}</span>
                            <span className="text-stone-400">Valid 15 Mins</span>
                          </div>
                          <div className="space-y-2 text-stone-300">
                            <div className="flex justify-between"><span>Metal Benchmark Rate ({quotation.rateSource}):</span><span className="font-bold">₹{quotation.ratePerGramInr.toLocaleString("en-IN")}/g</span></div>
                            <div className="flex justify-between"><span>Metal Value ({quotation.selectedWeightGrams}g):</span><span className="font-bold">₹{quotation.metalValueInr.toLocaleString("en-IN")}</span></div>
                            <div className="flex justify-between"><span>GST (3%):</span><span>₹{quotation.gstAmountInr.toLocaleString("en-IN")}</span></div>
                            <div className="flex justify-between text-emerald-400 font-bold"><span>Scheme Purchase Balance Applied:</span><span>- ₹{quotation.eligibleBalanceAppliedInr.toLocaleString("en-IN")}</span></div>
                            <div className="flex justify-between text-amber-300 font-extrabold text-base pt-2 border-t border-stone-800"><span>Net Difference Payable:</span><span>₹{quotation.netDifferencePayableInr.toLocaleString("en-IN")}</span></div>
                          </div>
                          <div className="pt-2 flex items-center gap-2">
                            <input type="checkbox" id="dashAcceptTerms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="rounded bg-stone-900 border-stone-700 text-amber-500" />
                            <label htmlFor="dashAcceptTerms" className="text-[0.7rem] text-stone-300">I accept live quotation breakdown &amp; statutory legal terms.</label>
                          </div>
                          <button
                            type="button"
                            onClick={handleAcceptQuotation}
                            disabled={!acceptedTerms || submittingRedemption}
                            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
                          >
                            {submittingRedemption ? "Submitting Order..." : "Confirm & Submit Redemption Order →"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 9. PROFILE SUMMARY SECTION */}
                <div id="profile" className="scroll-mt-24 rounded-3xl border border-stone-800 bg-stone-900/90 p-6 md:p-8 space-y-4 shadow-xl">
                  <div className="border-b border-stone-800 pb-4">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Customer Account</span>
                    <h3 className="font-bold text-stone-100 text-lg">Profile Summary</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                    <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                      <span className="text-stone-500 block">Customer Name</span>
                      <span className="font-extrabold text-stone-100 text-base">{userName}</span>
                    </div>
                    <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                      <span className="text-stone-500 block">Registered Mobile Number</span>
                      <span className="font-mono font-extrabold text-amber-300 text-sm">{userPhone || "Not Verified"}</span>
                    </div>
                    <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                      <span className="text-stone-500 block">Member Since</span>
                      <span className="font-bold text-stone-200">{new Date(dashboardData.enrollment?.startDate || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}</span>
                    </div>
                    <div className="bg-stone-950/60 p-4 rounded-2xl border border-stone-800">
                      <span className="text-stone-500 block">Total Active Schemes</span>
                      <span className="font-extrabold text-emerald-400 text-base">{schemes.length} Active Accounts</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Razorpay Sandbox Checkout Modal */}
      {showPaymentModal && activeScheme && (
        <RazorpayCheckoutModal
          enrollment={activeScheme}
          dashboardData={dashboardData}
          userName={userName}
          userPhone={userPhone}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      )}

      {/* Payment Success Modal */}
      {paymentSuccessReceiptNumber && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl bg-stone-900 border border-emerald-500/40 p-6 md:p-8 shadow-2xl space-y-4 text-center text-stone-100">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 grid place-items-center mx-auto text-emerald-400 text-2xl font-bold">
              ✓
            </div>
            <h3 className="font-display text-xl font-bold text-emerald-300">Payment Successful!</h3>
            <p className="text-xs text-stone-300">
              Your installment payment was verified and credited to your Scheme Purchase Balance.
            </p>
            <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 text-xs font-mono text-amber-300">
              Receipt Reference: {paymentSuccessReceiptNumber}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentSuccessReceiptNumber(null)}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md"
              >
                Return to Refreshed Dashboard →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Failure Modal */}
      {paymentFailureError && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-3xl bg-stone-900 border border-red-500/40 p-6 md:p-8 shadow-2xl space-y-4 text-center text-stone-100">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 grid place-items-center mx-auto text-red-400 text-2xl font-bold">
              ✕
            </div>
            <h3 className="font-display text-xl font-bold text-red-400">Payment Unsuccessful</h3>
            <p className="text-xs text-stone-300 font-semibold">{paymentFailureError}</p>
            <p className="text-[0.7rem] text-stone-400">
              Your installment remains unpaid. No money was deducted from your scheme balance.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentFailureError(null)}
                className="flex-1 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold border border-stone-700"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaymentFailureError(null);
                  handleOpenPaymentModal();
                }}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold shadow-md"
              >
                Retry Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptModalData && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-stone-900 border border-stone-800 p-6 md:p-8 shadow-2xl space-y-4 text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-bold text-stone-100 text-base">Official Payment Receipt</h3>
              <button onClick={() => setReceiptModalData(null)} className="text-stone-400 font-bold hover:text-stone-200">✕</button>
            </div>
            <div className="space-y-3 text-xs text-stone-300">
              <div className="flex justify-between"><span>Receipt Number:</span><span className="font-mono font-bold text-amber-300">{receiptModalData.receiptNumber}</span></div>
              <div className="flex justify-between"><span>Payment Date:</span><span>{new Date(receiptModalData.paymentDate).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>Amount Paid:</span><span className="font-extrabold text-amber-300 text-sm">₹{receiptModalData.amount.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>Scheme Account:</span><span>{receiptModalData.accountNumber}</span></div>
              <div className="flex justify-between"><span>Product Name:</span><span>{receiptModalData.productName}</span></div>
              <div className="flex justify-between"><span>Member Name:</span><span>{receiptModalData.userName}</span></div>
              <div className="pt-3 border-t border-stone-800 text-[0.7rem] text-stone-400">
                <span className="block font-bold text-stone-200 mb-1">Merchant Information:</span>
                <span className="block">{receiptModalData.merchantDetails?.sellerName}</span>
                <span className="block">GSTIN: {receiptModalData.merchantDetails?.gstin}</span>
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <button type="button" onClick={() => window.print()} className="px-5 py-2.5 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs hover:bg-amber-400 shadow-md">
                Download PDF / Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
