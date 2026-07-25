"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface CoinDenom {
  id: string;
  title: string;
  weightGrams: number;
  mintingFee: number;
  packagingFee: number;
  inStock: boolean;
}

interface SchemePlan {
  id: string;
  name: string;
  metalType: "GOLD" | "SILVER";
  purity: string;
  tenureMonths: number;
  minMonthlyAmount: number;
  maxMonthlyAmount: number;
  presetAmounts: number[];
  gracePeriodDays: number;
  termsVersion: string;
  kycRequired: boolean;
  version: number;
  coinDenominations: CoinDenom[];
  minCoinEstPriceInr: number;
}

export default function SchemesListingPage() {
  const [plans, setPlans] = useState<SchemePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<{ gold22kPerGram: number; silver999PerGram: number }>({
    gold22kPerGram: 7500,
    silver999PerGram: 90,
  });

  // Calculator State
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [monthlyAmount, setMonthlyAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>("");

  useEffect(() => {
    fetch("/api/v1/schemes")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setPlans(res.data.plans || []);
          if (res.data.plans?.length > 0) {
            setSelectedPlanId(res.data.plans[0].id);
          }
          if (res.data.prevailingRates) {
            setRates(res.data.prevailingRates);
          }
        }
      })
      .catch((err) => console.error("Failed to load schemes", err))
      .finally(() => setLoading(false));
  }, []);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const activeAmount = customAmount ? parseFloat(customAmount) || 0 : monthlyAmount;
  const tenure = selectedPlan ? selectedPlan.tenureMonths : 12;
  const totalScheduledAmount = activeAmount * tenure;

  const minCoinPrice = selectedPlan?.minCoinEstPriceInr || 0;
  const showMinCoinWarning = totalScheduledAmount > 0 && minCoinPrice > 0 && totalScheduledAmount < minCoinPrice;

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans">
      <Header />

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent pt-12 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900 border border-amber-300/50 mb-4">
            RateStack Official Savings Plan
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-900">
            Gold &amp; Silver Coin Savings Scheme
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-600">
            Plan ahead to own hallmarked 22K Gold and 999 Fine Silver coins with disciplined monthly savings.
          </p>

          {/* Key Compliance Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-stone-700">
            <span className="rounded-full bg-white px-3 py-1.5 border border-stone-200 shadow-sm">
              🛡️ Amount-Wallet Purchase Model
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 border border-stone-200 shadow-sm">
              🔒 Fixed Term (10, 12, 16 Months)
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 border border-stone-200 shadow-sm">
              ⚖️ Zero Interest / Zero Financial Returns Guaranteed
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 border border-stone-200 shadow-sm">
              🪙 916 Gold &amp; 999 Silver Coin Redemption Only
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {loading ? (
          <div className="py-20 text-center text-stone-500 animate-pulse font-medium">
            Loading official RateStack scheme products...
          </div>
        ) : (
          <>
            {/* Scheme Product Cards */}
            <section>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-stone-900">Select Scheme Category</h2>
                  <p className="text-sm text-stone-600 mt-1">Choose between 22K Gold Coin and 999 Silver Coin plans</p>
                </div>
                <div className="text-xs text-stone-500 bg-amber-50/80 px-3 py-2 rounded-lg border border-amber-200">
                  Today’s Benchmark: 22K Gold ₹{rates.gold22kPerGram.toLocaleString("en-IN")}/g | Silver 999 ₹{rates.silver999PerGram.toLocaleString("en-IN")}/g
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {plans.map((plan) => {
                  const isGold = plan.metalType === "GOLD";
                  const isSelected = plan.id === selectedPlanId;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setCustomAmount("");
                      }}
                      className={`relative cursor-pointer rounded-2xl border transition-all duration-200 bg-white p-6 sm:p-8 shadow-sm hover:shadow-md ${
                        isSelected
                          ? isGold
                            ? "border-amber-500 ring-2 ring-amber-500/20 bg-gradient-to-br from-amber-50/50 to-white"
                            : "border-slate-400 ring-2 ring-slate-400/20 bg-gradient-to-br from-slate-50/50 to-white"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-4 right-4 rounded-full bg-amber-600 px-3 py-0.5 text-xs font-bold text-white">
                          Selected
                        </span>
                      )}

                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className={`w-12 h-12 rounded-xl grid place-items-center font-bold text-xl ${
                            isGold ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          {isGold ? "🪙" : "⚪"}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-stone-900">{plan.name}</h3>
                          <p className="text-xs text-stone-500">
                            {plan.metalType === "GOLD" ? "22K (916 Hallmarked) Gold Coin" : "999 Fine Pure Silver Coin"}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-4 border-y border-stone-100 text-sm my-4">
                        <div>
                          <span className="block text-xs font-medium text-stone-500">Tenure</span>
                          <span className="font-semibold text-stone-800">{plan.tenureMonths} Months</span>
                        </div>
                        <div>
                          <span className="block text-xs font-medium text-stone-500">Monthly Contribution</span>
                          <span className="font-semibold text-stone-800">
                            ₹{plan.minMonthlyAmount.toLocaleString("en-IN")} – ₹{plan.maxMonthlyAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs font-medium text-stone-500">Grace Period</span>
                          <span className="font-semibold text-stone-800">{plan.gracePeriodDays} Days</span>
                        </div>
                        <div>
                          <span className="block text-xs font-medium text-stone-500">Coin Denominations</span>
                          <span className="font-semibold text-stone-800">
                            {plan.coinDenominations.map((d) => `${d.weightGrams}g`).join(", ")}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-stone-500">Terms Version: {plan.termsVersion}</span>
                        <Link
                          href={`/schemes/join/${plan.id}`}
                          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            isGold
                              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                              : "bg-slate-800 hover:bg-slate-900 text-white shadow-sm"
                          }`}
                        >
                          Join {plan.metalType === "GOLD" ? "Gold" : "Silver"} Scheme &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Scheme Calculator */}
            {selectedPlan && (
              <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                    🧮
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-stone-900">
                      Savings Calculator – {selectedPlan.name}
                    </h2>
                    <p className="text-xs text-stone-500">
                      Calculate your total scheduled savings balance over {selectedPlan.tenureMonths} months
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                  {/* Controls */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                        Suggested Monthly Amount
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedPlan.presetAmounts.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setMonthlyAmount(amt);
                              setCustomAmount("");
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                              monthlyAmount === amt && !customAmount
                                ? "bg-amber-700 text-white border-amber-700 shadow-sm"
                                : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                            }`}
                          >
                            ₹{amt.toLocaleString("en-IN")}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
                        Or Enter Custom Monthly Amount (₹{selectedPlan.minMonthlyAmount} - ₹{selectedPlan.maxMonthlyAmount})
                      </label>
                      <input
                        type="number"
                        min={selectedPlan.minMonthlyAmount}
                        max={selectedPlan.maxMonthlyAmount}
                        placeholder={`Enter amount e.g. 1500`}
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-600/20"
                      />
                    </div>
                  </div>

                  {/* Calculator Summary */}
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-6 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-600">Monthly Contribution</span>
                      <span className="font-bold text-stone-900">₹{activeAmount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-600">Tenure</span>
                      <span className="font-bold text-stone-900">{selectedPlan.tenureMonths} Months</span>
                    </div>
                    <div className="pt-3 border-t border-amber-200/80 flex justify-between items-center">
                      <span className="font-bold text-stone-800 text-base">Total Scheduled Scheme Purchase Balance</span>
                      <span className="font-display font-extrabold text-2xl text-amber-900">
                        ₹{totalScheduledAmount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Minimum Coin Denomination Warning */}
                    {showMinCoinWarning && (
                      <div className="mt-4 rounded-lg bg-amber-100/80 border border-amber-300 p-3 text-xs text-amber-900 leading-relaxed">
                        ⚠️ <strong>Notice on Redemption Value:</strong> Your total scheduled savings (₹
                        {totalScheduledAmount.toLocaleString("en-IN")}) is less than the current estimated cost of the lowest available coin denomination (₹
                        {minCoinPrice.toLocaleString("en-IN")}). You may need to pay an additional difference amount at maturity to redeem your coin.
                      </div>
                    )}

                    <div className="pt-4">
                      <Link
                        href={`/schemes/join/${selectedPlan.id}?amount=${activeAmount}`}
                        className="block text-center w-full rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 text-sm transition-all shadow-sm"
                      >
                        Proceed to Join Scheme &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Mandatory Scheme Terms & Risk Disclosure */}
            <section className="rounded-2xl border border-stone-200 bg-stone-50 p-6 sm:p-8 space-y-4 text-xs text-stone-600 leading-relaxed">
              <h3 className="font-bold text-stone-900 uppercase tracking-wider text-sm">
                📌 Key Scheme Terms &amp; Regulatory Disclosures
              </h3>
              <ul className="grid sm:grid-cols-2 gap-3 list-disc list-inside">
                <li>This is an amount-wallet coin purchase savings plan, NOT a deposit or investment scheme.</li>
                <li>No interest, bonus, or guaranteed monetary appreciation is promised or provided.</li>
                <li>
                  Accumulated balances (<strong>Scheme Purchase Balance</strong>) can only be redeemed towards the selected 22K Gold / Silver coin category upon maturity.
                </li>
                <li>Balances are strictly non-withdrawable, non-transferable, and non-p2p transferable.</li>
                <li>Prevailing market price, GST (3%), minting/making fees, and delivery charges apply at the time of final redemption quotation.</li>
                <li>Auto-redemption is not practiced. Redemption requires explicit server quotation and user acceptance.</li>
              </ul>
              <div className="pt-2 text-stone-500">
                For detailed policy terms, please visit our <Link href="/schemes/terms" className="underline font-semibold hover:text-amber-800">Scheme Terms &amp; Conditions Page</Link>.
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
