"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminSchemesDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/schemes/reports")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-12 text-center text-xs text-stone-500 animate-pulse">Loading scheme admin metrics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Total Scheme Members</span>
          <span className="font-display font-extrabold text-2xl text-stone-900 mt-1 block">
            {data?.totalMembers || 0}
          </span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Active Schemes</span>
          <span className="font-display font-extrabold text-2xl text-stone-900 mt-1 block">
            {data?.activeSchemes || 0}
          </span>
          <span className="text-[0.65rem] text-stone-500 block mt-1">Matured: {data?.maturedSchemes || 0}</span>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
          <span className="block text-xs font-bold text-amber-800 uppercase tracking-wider">Total Collections</span>
          <span className="font-display font-extrabold text-2xl text-amber-950 mt-1 block">
            ₹{(data?.totalVerifiedCollectionsInr || 0).toLocaleString("en-IN")}
          </span>
          <span className="text-[0.65rem] font-semibold text-amber-700 block mt-1">
            Gold: ₹{(data?.goldCollectionsInr || 0).toLocaleString("en-IN")} | Silver: ₹{(data?.silverCollectionsInr || 0).toLocaleString("en-IN")}
          </span>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="block text-xs font-bold text-stone-500 uppercase tracking-wider">Scheme Purchase Balance Liability</span>
          <span className="font-display font-extrabold text-2xl text-stone-900 mt-1 block">
            ₹{(data?.totalPurchaseLiabilityInr || 0).toLocaleString("en-IN")}
          </span>
          <span className="text-[0.65rem] text-stone-500 block mt-1">Accumulated Eligible Balance</span>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3 shadow-sm">
          <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">Merchant &amp; Legal Compliance</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Configure legal seller name, GSTIN, invoice issuer, and record Owner, CA, and Legal counsel approvals.
          </p>
          <Link
            href="/admin/schemes/merchant-config"
            className="inline-block px-4 py-2 bg-stone-900 text-white font-bold rounded-xl text-xs hover:bg-stone-800"
          >
            Manage Compliance &rarr;
          </Link>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3 shadow-sm">
          <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">Maker-Checker Payments</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Review offline/manual payments pending approval. Strict maker-checker security rule enforced.
          </p>
          <Link
            href="/admin/schemes/manual-payments"
            className="inline-block px-4 py-2 bg-stone-900 text-white font-bold rounded-xl text-xs hover:bg-stone-800"
          >
            Review Pending Queue &rarr;
          </Link>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 space-y-3 shadow-sm">
          <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">Financial &amp; Liability Reports</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            Generate and export financial reports, outstanding liabilities, and collection summaries as CSV.
          </p>
          <Link
            href="/admin/schemes/reports"
            className="inline-block px-4 py-2 bg-amber-700 text-white font-bold rounded-xl text-xs hover:bg-amber-800"
          >
            Export Financial CSV &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
