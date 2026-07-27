"use client";

import { useEffect, useState } from "react";

interface AdminPlan {
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
  isActive: boolean;
  visibility: boolean;
  version: number;
  memberCount: number;
  totalCollectionsInr: number;
  coinDenominations: { id: string; title: string; weightGrams: number; inStock: boolean }[];
}

export default function AdminSchemePlansPage() {
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchPlans = () => {
    fetch("/api/v1/admin/schemes/plans")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.plans) {
          setPlans(res.data.plans);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const togglePlanActive = async (planId: string, currentActive: boolean) => {
    setUpdatingId(planId);
    try {
      const res = await fetch("/api/v1/admin/schemes/plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPlans();
      }
    } catch (err) {
      console.error("Failed to update plan", err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-stone-500 animate-pulse">Loading scheme plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-stone-900">Gold &amp; Silver Savings Scheme Plans</h1>
          <p className="text-xs text-stone-500 mt-1">Manage 12M, 24M, and 36M Gold &amp; Silver Coin Savings Products independently.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[0.65rem] font-extrabold uppercase tracking-wider ${
                    plan.metalType === "GOLD" ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-slate-200 text-slate-900 border border-slate-300"
                  }`}>
                    {plan.metalType} ({plan.purity}) • {plan.tenureMonths} Months
                  </span>
                  <h2 className="font-bold text-stone-900 text-base mt-2">{plan.name}</h2>
                  <p className="text-[0.7rem] text-stone-400 font-mono mt-0.5">ID: {plan.id}</p>
                </div>
                <button
                  type="button"
                  disabled={updatingId === plan.id}
                  onClick={() => togglePlanActive(plan.id, plan.isActive)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                    plan.isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  }`}
                >
                  {updatingId === plan.id ? "Updating..." : plan.isActive ? "Active (Toggle)" : "Inactive (Toggle)"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-stone-50 p-4 rounded-xl border border-stone-100 my-4">
                <div>
                  <span className="text-stone-500 block">Tenure</span>
                  <span className="font-bold text-stone-900">{plan.tenureMonths} Months</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Enrolled Members</span>
                  <span className="font-bold text-emerald-700">{plan.memberCount} Members</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Monthly Contribution</span>
                  <span className="font-bold text-stone-900">₹{plan.minMonthlyAmount} – ₹{plan.maxMonthlyAmount}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Total Collections</span>
                  <span className="font-bold text-amber-800">₹{plan.totalCollectionsInr.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">Available Coin Denominations</h3>
                <div className="flex flex-wrap gap-1.5">
                  {plan.coinDenominations?.map((denom) => (
                    <span key={denom.id} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-stone-200 rounded-md text-[0.7rem] font-medium text-stone-800">
                      <span className="font-bold text-amber-700">{denom.weightGrams}g</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 text-[0.7rem] text-stone-400 flex justify-between">
              <span>Terms: {plan.termsVersion}</span>
              <span>Grace: {plan.gracePeriodDays} Days</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
