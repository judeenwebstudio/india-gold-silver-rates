"use client";

import { useEffect, useState } from "react";

export default function ReportsAdminPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/schemes/reports")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) setSummary(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    window.open("/api/v1/admin/schemes/reports?format=csv", "_blank");
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-stone-500 animate-pulse">Loading financial reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-stone-900 text-lg">Financial &amp; Product Liabilities Reports</h2>
          <p className="text-xs text-stone-500">
            Real-time audit statements of verified collections, product-wise liabilities, and scheme maturity status.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs flex items-center gap-2"
        >
          📥 Download Full Financial CSV Report
        </button>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
        <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider">Financial Liability Summary</h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-stone-500 block font-semibold">Total Verified Collections</span>
            <span className="font-display font-extrabold text-xl text-stone-900 mt-1 block">
              ₹{(summary?.totalVerifiedCollectionsInr || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-stone-500 block font-semibold">Gold Scheme Collections</span>
            <span className="font-display font-extrabold text-xl text-amber-900 mt-1 block">
              ₹{(summary?.goldCollectionsInr || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-stone-500 block font-semibold">Silver Scheme Collections</span>
            <span className="font-display font-extrabold text-xl text-slate-800 mt-1 block">
              ₹{(summary?.silverCollectionsInr || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-amber-900 block font-bold">Total Scheme Purchase Balance Liability</span>
            <span className="font-display font-extrabold text-xl text-amber-950 mt-1 block">
              ₹{(summary?.totalPurchaseLiabilityInr || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-stone-500 block font-semibold">Total Scheduled Liabilities</span>
            <span className="font-display font-extrabold text-xl text-stone-900 mt-1 block">
              ₹{(summary?.totalScheduledLiabilitiesInr || 0).toLocaleString("en-IN")}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-stone-500 block font-semibold">Total Registered Members</span>
            <span className="font-display font-extrabold text-xl text-stone-900 mt-1 block">
              {summary?.totalMembers || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
