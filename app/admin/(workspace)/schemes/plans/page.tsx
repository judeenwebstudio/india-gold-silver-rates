"use client";

import { useEffect, useState } from "react";

export default function AdminSchemePlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/schemes")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.plans) {
          setPlans(res.data.plans);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-xs text-stone-500 animate-pulse">Loading scheme plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-stone-900">Gold &amp; Silver Savings Scheme Plans</h1>
          <p className="text-xs text-stone-500 mt-1">Configured 22K Gold and 999 Silver coin savings products and allowed weight denominations.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[0.65rem] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                  {plan.metalType} ({plan.purity})
                </span>
                <h2 className="font-bold text-stone-900 text-base mt-2">{plan.name}</h2>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Active (v{plan.version})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-stone-50 p-4 rounded-xl border border-stone-100">
              <div>
                <span className="text-stone-500 block">Tenure</span>
                <span className="font-bold text-stone-900">{plan.tenureMonths} Months</span>
              </div>
              <div>
                <span className="text-stone-500 block">Grace Period</span>
                <span className="font-bold text-stone-900">{plan.gracePeriodDays} Days</span>
              </div>
              <div>
                <span className="text-stone-500 block">Monthly Savings Range</span>
                <span className="font-bold text-stone-900">₹{(plan.minMonthlyAmountPaise / 100).toLocaleString("en-IN")} – ₹{(plan.maxMonthlyAmountPaise / 100).toLocaleString("en-IN")}</span>
              </div>
              <div>
                <span className="text-stone-500 block">Terms Version</span>
                <span className="font-bold text-stone-900">{plan.termsVersion}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">Available Coin Denominations</h3>
              <div className="flex flex-wrap gap-2">
                {plan.denominations?.map((denom: any) => (
                  <span key={denom.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-800">
                    <span className="font-bold text-amber-700">{denom.title}</span>
                    <span className="text-[0.65rem] text-stone-400">({denom.weightMilligrams / 1000}g)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
