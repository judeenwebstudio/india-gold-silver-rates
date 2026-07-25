"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthModal } from "@/components/AuthModal";

export function HomeCustomerDashboardSection() {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [schemes, setSchemes] = useState<any[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // Auth Modal state for unauthenticated triggers
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Receipt modal state
  const [receiptModalData, setReceiptModalData] = useState<any>(null);

  // Redemption state
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
      .catch((err) => setError("Network error loading schemes"))
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
      .catch((err) => setError("Network error loading dashboard"))
      .finally(() => setLoadingDashboard(false));
  };

  useEffect(() => {
    const token = getToken();
    setUserToken(token);
    if (token) {
      loadUserSchemes(token);
    }
  }, []);

  useEffect(() => {
    if (userToken && selectedSchemeId) {
      loadSchemeDashboard(userToken, selectedSchemeId);
    }
  }, [selectedSchemeId, userToken]);

  const triggerAuthRequired = (mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handlePayInstallment = async () => {
    const token = getToken();
    if (!token) {
      triggerAuthRequired("login");
      return;
    }
    if (!selectedSchemeId) return;

    setError(null);
    setPaying(true);

    try {
      // 1. Create Payment Order
      const orderRes = await fetch(`/api/v1/me/schemes/${selectedSchemeId}/payments/order`, {
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
      const verifyRes = await fetch(`/api/v1/me/schemes/${selectedSchemeId}/payments/verify`, {
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

      // Reload schemes & active dashboard
      loadUserSchemes(token);
      loadSchemeDashboard(token, selectedSchemeId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
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
        setRedemptionSuccessMsg("Redemption request submitted successfully! Ref: " + resData.data.redemptionRequestId);
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

  const totalCombinedBalance = schemes.reduce((acc, s) => acc + (s.schemePurchaseBalance || 0), 0);

  if (!userToken) {
    return (
      <section id="my-schemes" className="scroll-mt-20 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl border border-stone-800 bg-stone-900/90 p-6 md:p-8 text-stone-100 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-800 pb-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
                RateStack Coin Savings Plan
              </span>
              <h2 className="font-display text-xl md:text-2xl font-extrabold text-amber-100">
                Gold &amp; Silver Savings Scheme Overview
              </h2>
              <p className="text-xs text-stone-400 mt-1 max-w-2xl">
                Save monthly in 22K Gold (916) or 999 Fine Silver coins with 0% interest, double-entry verified accounting, and weight-based physical coin redemption upon maturity.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => triggerAuthRequired("login")}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all"
              >
                Sign In to Dashboard
              </button>
              <button
                type="button"
                onClick={() => triggerAuthRequired("register")}
                className="px-4 py-2.5 rounded-xl border border-stone-700 bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs shadow-sm transition-all"
              >
                Register
              </button>
            </div>
          </div>

          {/* Guest Action Cards: My Schemes, Pay Installment, Redeem Coin */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => triggerAuthRequired("login")}
              className="cursor-pointer rounded-2xl border border-stone-800 bg-stone-950/60 p-4 hover:border-amber-500/40 transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">My Schemes</span>
                <span className="text-stone-500 group-hover:translate-x-1 transition-transform text-xs">Login &rarr;</span>
              </div>
              <p className="text-[0.7rem] text-stone-400">View your active enrolled 22K Gold &amp; 999 Silver scheme accounts.</p>
            </div>

            <div
              onClick={() => triggerAuthRequired("login")}
              className="cursor-pointer rounded-2xl border border-stone-800 bg-stone-950/60 p-4 hover:border-amber-500/40 transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Pay Installment</span>
                <span className="text-stone-500 group-hover:translate-x-1 transition-transform text-xs">Login &rarr;</span>
              </div>
              <p className="text-[0.7rem] text-stone-400">Pay monthly installments securely with instant ledger verification &amp; receipts.</p>
            </div>

            <div
              onClick={() => triggerAuthRequired("login")}
              className="cursor-pointer rounded-2xl border border-stone-800 bg-stone-950/60 p-4 hover:border-amber-500/40 transition-all space-y-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Redeem Coin</span>
                <span className="text-stone-500 group-hover:translate-x-1 transition-transform text-xs">Login &rarr;</span>
              </div>
              <p className="text-[0.7rem] text-stone-400">Request live server quotation &amp; coin delivery upon scheme maturity.</p>
            </div>
          </div>
        </div>

        {showAuthModal && (
          <AuthModal
            initialMode={authMode}
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              setShowAuthModal(false);
              const token = getToken();
              setUserToken(token);
              if (token) loadUserSchemes(token);
            }}
          />
        )}
      </section>
    );
  }

  return (
    <section id="my-schemes" className="scroll-mt-20 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Authenticated Customer Scheme Dashboard */}
      <div className="space-y-6 text-stone-100">
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-stone-900 via-amber-950/30 to-stone-900 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-[0.68rem] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
              Customer Savings Dashboard
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-extrabold text-amber-100">
              Welcome back to RateStack Savings!
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Verified Scheme Purchase Balance: <span className="font-extrabold text-amber-300">₹{totalCombinedBalance.toLocaleString("en-IN")}</span> across {schemes.length} enrolled accounts
            </p>
          </div>
          <Link
              href="/schemes"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-md transition-all shrink-0"
            >
              + Enroll In New Scheme
            </Link>
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

          {loadingSchemes ? (
            <div className="py-12 text-center text-xs text-stone-500 animate-pulse">Loading scheme accounts...</div>
          ) : schemes.length === 0 ? (
            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-8 text-center space-y-3">
              <p className="text-sm font-bold text-stone-200">You haven't joined any coin savings scheme accounts yet.</p>
              <Link href="/schemes" className="inline-block px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs">
                Browse Gold &amp; Silver Plans &rarr;
              </Link>
            </div>
          ) : (
            <>
              {/* Scheme Account Selector Pills */}
              <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-none">
                {schemes.map((s) => {
                  const isSelected = s.id === selectedSchemeId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSchemeId(s.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-bold transition-all shrink-0 ${
                        isSelected
                          ? "bg-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/20"
                          : "bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700"
                      }`}
                    >
                      <span>{s.productName}</span>
                      <span className={`text-[0.65rem] px-2 py-0.5 rounded-full ${isSelected ? "bg-stone-950 text-amber-300" : "bg-stone-800 text-stone-400"}`}>
                        #{s.accountNumber}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Detailed Active Dashboard Component */}
              {loadingDashboard || !dashboardData ? (
                <div className="py-12 text-center text-xs text-stone-500 animate-pulse">Loading active scheme metrics...</div>
              ) : (
                <div className="space-y-6">
                  {/* Primary Metric Grid - Terminology: Scheme Purchase Balance */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-stone-900 to-amber-950/30 p-5 space-y-1 shadow-lg">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                        Scheme Purchase Balance
                      </span>
                      <span className="font-display font-extrabold text-2xl md:text-3xl text-amber-100 block">
                        ₹{(dashboardData.schemePurchaseBalance || 0).toLocaleString("en-IN")}
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
                        ₹{(dashboardData.verifiedContributionTotal || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[0.68rem] text-stone-400 block pt-1">
                        {dashboardData.paidInstallmentCount} of {dashboardData.totalInstallments} Paid
                      </span>
                    </div>

                    <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 space-y-1">
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                        Amount Remaining
                      </span>
                      <span className="font-display font-extrabold text-2xl text-stone-100 block">
                        ₹{(dashboardData.remainingScheduledAmount || 0).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[0.68rem] text-stone-400 block pt-1">
                        {dashboardData.remainingInstallmentCount === 0 ? "All scheduled installments completed" : `${dashboardData.remainingInstallmentCount} Remaining`}
                      </span>
                    </div>

                    <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-5 space-y-1">
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                        Next Due Date
                      </span>
                      <span className="font-display font-extrabold text-xl text-stone-100 block">
                        {dashboardData.nextInstallment ? new Date(dashboardData.nextInstallment.dueDate).toLocaleDateString("en-IN") : "Matured"}
                      </span>
                      {dashboardData.nextInstallment && (
                        <span
                          className={`inline-block text-[0.65rem] font-bold px-2 py-0.5 rounded uppercase mt-1 ${
                            dashboardData.nextInstallment.statusTag === "OVERDUE"
                              ? "bg-red-500/20 text-red-300 border border-red-500/30"
                              : dashboardData.nextInstallment.statusTag === "DUE_TODAY"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {dashboardData.nextInstallment.statusTag.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Savings Progress Card */}
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                        Verified Savings Progress
                      </span>
                      <span className="font-bold text-amber-400 text-sm">{dashboardData.progressPercent}%</span>
                    </div>
                    <div className="h-3 w-full bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                        style={{ width: `${Math.min(100, dashboardData.progressPercent)}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-stone-800">
                      <div>
                        <span className="text-stone-500 block">Paid</span>
                        <span className="font-bold text-emerald-400">{dashboardData.paidInstallmentCount}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">Total</span>
                        <span className="font-bold text-stone-200">{dashboardData.totalInstallments}</span>
                      </div>
                      <div>
                        <span className="text-stone-500 block">Remaining</span>
                        <span className="font-bold text-amber-300">{dashboardData.remainingInstallmentCount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Payment Trigger */}
                  {dashboardData.enrollment?.status === "ACTIVE" && (
                    <button
                      type="button"
                      onClick={handlePayInstallment}
                      disabled={paying}
                      className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                    >
                      {paying ? "Processing Payment..." : `Pay Due Installment (₹${dashboardData.enrollment.monthlyAmount.toLocaleString("en-IN")})`}
                    </button>
                  )}

                  {/* Timeline & Receipts */}
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Timeline */}
                    <div className="md:col-span-2 rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-4">
                      <h3 className="font-bold text-stone-100 text-sm">Installment Schedule Timeline</h3>
                      <div className="divide-y divide-stone-800">
                        {dashboardData.installments?.map((inst: any) => (
                          <div key={inst.id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full grid place-items-center font-bold text-[0.65rem] ${inst.status === "PAID" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-stone-800 text-stone-400"}`}>
                                {inst.installmentNo}
                              </span>
                              <div>
                                <span className="font-semibold text-stone-200 block">Installment #{inst.installmentNo}</span>
                                <span className="text-stone-500 block">Due: {new Date(inst.dueDate).toLocaleDateString("en-IN")}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-stone-100 block">₹{inst.amount.toLocaleString("en-IN")}</span>
                              <span className={`text-[0.65rem] font-bold ${inst.status === "PAID" ? "text-emerald-400" : "text-amber-400"}`}>
                                {inst.status === "PAID" ? `Paid ${new Date(inst.paidAt).toLocaleDateString("en-IN")}` : "Pending"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Receipts */}
                    <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-4">
                      <h3 className="font-bold text-stone-100 text-sm">Payment Receipts</h3>
                      {dashboardData.recentReceipts?.length === 0 ? (
                        <p className="text-xs text-stone-500 italic">No receipts generated yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {dashboardData.recentReceipts?.map((r: any) => (
                            <div key={r.id} className="p-3 rounded-xl border border-stone-800 bg-stone-950/60 flex items-center justify-between text-xs">
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

                  {/* Payment History & Retry */}
                  <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-4">
                    <h3 className="font-bold text-stone-100 text-sm">Payment History</h3>
                    {dashboardData.recentPayments?.length === 0 ? (
                      <p className="text-xs text-stone-500 italic">No payment history recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-stone-800 text-stone-500 font-bold uppercase tracking-wider">
                              <th className="p-2.5">Order Ref</th>
                              <th className="p-2.5">Amount</th>
                              <th className="p-2.5">Gateway</th>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-800/60 text-stone-300">
                            {dashboardData.recentPayments?.map((p: any) => (
                              <tr key={p.id}>
                                <td className="p-2.5 font-mono text-stone-400">{p.orderId}</td>
                                <td className="p-2.5 font-bold text-stone-100">₹{p.amount.toLocaleString("en-IN")}</td>
                                <td className="p-2.5">{p.gateway}</td>
                                <td className="p-2.5">{new Date(p.createdAt).toLocaleDateString("en-IN")}</td>
                                <td className="p-2.5">
                                  <span className={`px-2 py-0.5 rounded text-[0.65rem] font-bold ${p.status === "SUCCESS" ? "bg-emerald-500/20 text-emerald-300" : p.status === "FAILED" || p.status === "EXPIRED" ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"}`}>
                                    {p.status}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right">
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
                  <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-stone-900 to-amber-950/20 p-6 space-y-6 shadow-xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                      <div>
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
                          Maturity Coin Redemption
                        </span>
                        <h3 className="font-display text-lg font-bold text-amber-100">
                          Redeem {dashboardData.enrollment?.metalType === "GOLD" ? "22K Gold Coin" : "Silver 999 Coin"}
                        </h3>
                      </div>
                      {!dashboardData.redemptionEligibility?.isEligible && (
                        <span className="px-3 py-1.5 rounded-xl bg-stone-800 text-amber-400 text-xs font-bold border border-amber-500/20">
                          {dashboardData.redemptionEligibility?.reasonIfNotEligible}
                        </span>
                      )}
                    </div>

                    {!dashboardData.redemptionEligibility?.isEligible ? (
                      <div className="bg-stone-950/60 p-6 rounded-2xl border border-stone-800 text-center space-y-2">
                        <p className="text-xs text-stone-300 font-semibold">
                          🔒 Redemption unlocks automatically after maturity on{" "}
                          <span className="text-amber-300 font-bold">
                            {new Date(dashboardData.enrollment?.maturityDate || Date.now()).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-300 mb-1">Select Allowed Coin Denomination:</label>
                            <select
                              value={selectedDenominationId}
                              onChange={(e) => setSelectedDenominationId(e.target.value)}
                              className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-xs text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
                            >
                              {dashboardData.schemePlan?.coinDenominations?.map((d: any) => (
                                <option key={d.id} value={d.id}>
                                  {d.title} ({d.weightGrams}g) — Minting Fee: ₹{d.mintingFee}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-300 mb-1">Fulfilment Method:</label>
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
                          {quoting ? "Calculating..." : "Generate Live Server Quotation →"}
                        </button>

                        {quotation && (
                          <div className="bg-stone-950 p-5 rounded-2xl border border-amber-500/40 space-y-3 text-xs">
                            <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                              <span className="font-mono text-amber-400">Quote #{quotation.quotationNumber}</span>
                              <span className="text-stone-400">Valid 15 Mins</span>
                            </div>
                            <div className="space-y-1.5 text-stone-300">
                              <div className="flex justify-between"><span>Rate ({quotation.rateSource}):</span><span className="font-bold">₹{quotation.ratePerGramInr.toLocaleString("en-IN")}/g</span></div>
                              <div className="flex justify-between"><span>Metal Value ({quotation.selectedWeightGrams}g):</span><span className="font-bold">₹{quotation.metalValueInr.toLocaleString("en-IN")}</span></div>
                              <div className="flex justify-between"><span>GST (3%):</span><span>₹{quotation.gstAmountInr.toLocaleString("en-IN")}</span></div>
                              <div className="flex justify-between text-emerald-400 font-bold"><span>Scheme Purchase Balance:</span><span>- ₹{quotation.eligibleBalanceAppliedInr.toLocaleString("en-IN")}</span></div>
                              <div className="flex justify-between text-amber-300 font-extrabold text-sm pt-2 border-t border-stone-800"><span>Net Difference Payable:</span><span>₹{quotation.netDifferencePayableInr.toLocaleString("en-IN")}</span></div>
                            </div>
                            <div className="pt-2 flex items-center gap-2">
                              <input type="checkbox" id="homeAcceptTerms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="rounded bg-stone-900 border-stone-700 text-amber-500" />
                              <label htmlFor="homeAcceptTerms" className="text-[0.7rem] text-stone-300">I accept live quotation &amp; terms.</label>
                            </div>
                            <button
                              type="button"
                              onClick={handleAcceptQuotation}
                              disabled={!acceptedTerms || submittingRedemption}
                              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
                            >
                              {submittingRedemption ? "Submitting..." : "Confirm & Submit Redemption Order →"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {/* Shared Auth Modal */}
      {showAuthModal && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            const token = getToken();
            setUserToken(token);
            if (token) loadUserSchemes(token);
          }}
        />
      )}

      {/* Receipt Modal */}
      {receiptModalData && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-stone-900 border border-stone-800 p-6 shadow-2xl space-y-4">
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
                <span className="block">{receiptModalData.merchantDetails.sellerName}</span>
                <span className="block">GSTIN: {receiptModalData.merchantDetails.gstin}</span>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-amber-500 text-stone-950 font-bold rounded-xl text-xs hover:bg-amber-400">
                Print / Save Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
