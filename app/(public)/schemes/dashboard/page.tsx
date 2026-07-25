"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function CustomerSchemesDashboardPage() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("scheme_user_token");
    if (!token) {
      setError("Please sign in to view your savings schemes.");
      setLoading(false);
      return;
    }

    fetch("/api/v1/me/schemes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setSchemes(res.data || []);
        } else {
          setError(res.error?.message || "Failed to load user schemes");
        }
      })
      .catch((err) => setError("Network error loading schemes"))
      .finally(() => setLoading(false));
  }, []);

  const totalBalance = schemes.reduce((acc, s) => acc + (s.schemePurchaseBalance || 0), 0);
  const activeCount = schemes.filter((s) => s.status === "ACTIVE").length;
  const maturedCount = schemes.filter((s) => s.status === "MATURED" || s.status === "REDEEMED").length;

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Banner Header */}
        <div className="rounded-3xl bg-gradient-to-r from-stone-900 via-amber-950/40 to-stone-900 border border-amber-500/30 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-2">
              RateStack Savings Portal
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-amber-100 tracking-tight">
              My Savings Schemes Dashboard
            </h1>
            <p className="text-xs md:text-sm text-stone-400 mt-1 max-w-xl">
              Track your verified Scheme Purchase Balance, installment payments, receipts, and gold/silver coin redemption eligibility.
            </p>
          </div>
          <Link
            href="/schemes"
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all shrink-0"
          >
            Explore New Schemes &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-stone-500 animate-pulse text-sm">
            Loading your scheme accounts...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-8 text-center space-y-4">
            <p className="text-red-400 text-sm font-semibold">{error}</p>
            <Link
              href="/schemes"
              className="inline-block px-4 py-2 bg-stone-800 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold"
            >
              Go to Schemes Registration
            </Link>
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
            {/* Overall Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-stone-900 to-amber-950/30 p-6 space-y-2 shadow-lg">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Total Scheme Purchase Balance
                </span>
                <span className="font-display font-extrabold text-3xl text-amber-100 block">
                  ₹{totalBalance.toLocaleString("en-IN")}
                </span>
                <span className="text-[0.7rem] text-stone-400 block">
                  Combined verified eligible balance across {schemes.length} scheme accounts
                </span>
              </div>

              <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-2">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                  Active Scheme Accounts
                </span>
                <span className="font-display font-extrabold text-3xl text-stone-100 block">
                  {activeCount}
                </span>
                <span className="text-[0.7rem] text-emerald-400 block">
                  Ongoing monthly installment plans
                </span>
              </div>

              <div className="rounded-2xl border border-stone-800 bg-stone-900/80 p-6 space-y-2">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                  Matured / Redeemed Schemes
                </span>
                <span className="font-display font-extrabold text-3xl text-stone-100 block">
                  {maturedCount}
                </span>
                <span className="text-[0.7rem] text-amber-300 block">
                  Eligible for coin delivery or pickup
                </span>
              </div>
            </div>

            {/* My Schemes List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-stone-200 tracking-tight">My Scheme Accounts</h2>
                <span className="text-xs text-stone-400">{schemes.length} total enrolled</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {schemes.map((s) => {
                  const isGold = s.metalType === "GOLD";
                  return (
                    <div
                      key={s.id}
                      className={`rounded-2xl border p-6 space-y-4 transition-all ${
                        isGold
                          ? "border-amber-500/30 bg-gradient-to-b from-stone-900/90 to-amber-950/20"
                          : "border-stone-700/50 bg-gradient-to-b from-stone-900/90 to-slate-900/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[0.65rem] font-extrabold uppercase tracking-wider mb-1 ${
                              isGold
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-slate-700/40 text-slate-300 border border-slate-600/30"
                            }`}
                          >
                            {s.productName}
                          </span>
                          <p className="font-mono text-xs font-bold text-stone-400">
                            A/C: {s.accountNumber}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                            s.status === "ACTIVE"
                              ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-950/40 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 bg-stone-950/60 p-4 rounded-xl text-xs border border-stone-800">
                        <div>
                          <span className="text-stone-500 block">Scheme Purchase Balance</span>
                          <span className="font-bold text-amber-300 text-sm">
                            ₹{(s.schemePurchaseBalance || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 block">Monthly Installment</span>
                          <span className="font-bold text-stone-200 text-sm">
                            ₹{(s.monthlyAmount || 0).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 block">Tenure Progress</span>
                          <span className="font-bold text-stone-300">
                            {s.paidInstallmentCount} / {s.tenureMonths} Months
                          </span>
                        </div>
                        <div>
                          <span className="text-stone-500 block">Next Due Date</span>
                          <span className="font-bold text-stone-300">
                            {s.nextDueDate
                              ? new Date(s.nextDueDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Matured"}
                          </span>
                        </div>
                      </div>

                      {/* Accessible Progress Bar */}
                      <div>
                        <div className="flex justify-between text-[0.7rem] text-stone-400 mb-1">
                          <span>Verified Savings Progress</span>
                          <span className="font-bold text-amber-400">{s.progressPercent || 0}%</span>
                        </div>
                        <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isGold ? "bg-gradient-to-r from-amber-600 to-amber-400" : "bg-gradient-to-r from-slate-500 to-slate-300"
                            }`}
                            style={{ width: `${Math.min(100, s.progressPercent || 0)}%` }}
                          />
                        </div>
                      </div>

                      <Link
                        href={`/schemes/dashboard/${s.id}`}
                        className={`block text-center w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                          isGold
                            ? "bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md shadow-amber-500/10"
                            : "bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700"
                        }`}
                      >
                        Open Detailed Scheme Dashboard &rarr;
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
