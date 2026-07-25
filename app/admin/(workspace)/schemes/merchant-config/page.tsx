"use client";

import { useEffect, useState } from "react";

export default function MerchantConfigAdminPage() {
  const [config, setConfig] = useState({
    legalSellerName: "",
    gstin: "",
    invoiceIssuer: "",
    coinSupplier: "",
    fulfilmentEntity: "",
    refundLiableEntity: "",
    ownerApproved: false,
    caApproved: false,
    legalApproved: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/schemes/merchant-config")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data) {
          setConfig({
            legalSellerName: res.data.legalSellerName || "",
            gstin: res.data.gstin || "",
            invoiceIssuer: res.data.invoiceIssuer || "",
            coinSupplier: res.data.coinSupplier || "",
            fulfilmentEntity: res.data.fulfilmentEntity || "",
            refundLiableEntity: res.data.refundLiableEntity || "",
            ownerApproved: !!res.data.ownerApproved,
            caApproved: !!res.data.caApproved,
            legalApproved: !!res.data.legalApproved,
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch("/api/v1/admin/schemes/merchant-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error?.message || "Failed to save configuration");
      }

      setMsg("Merchant configuration and approval flags saved successfully!");
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-stone-500 animate-pulse">Loading compliance parameters...</div>;
  }

  const isFullyApproved = config.ownerApproved && config.caApproved && config.legalApproved;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
        <div>
          <h2 className="font-bold text-stone-900 text-lg">Merchant &amp; Legal Compliance Guard</h2>
          <p className="text-xs text-stone-500 mt-1">
            Mandatory merchant configuration identifying the legal seller, GSTIN, invoice issuer, supplier, fulfilment, and approval flags. Live payment processing and plan enrollment block automatically until all 3 approvals are recorded.
          </p>
        </div>

        {msg && (
          <div
            className={`rounded-xl p-3 text-xs font-bold ${
              msg.startsWith("Error") ? "bg-red-50 text-red-800 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
            }`}
          >
            {msg}
          </div>
        )}

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs space-y-1">
          <span className="font-bold text-amber-900 block">Guard Status:</span>
          <span className={isFullyApproved ? "text-emerald-800 font-extrabold" : "text-amber-800 font-bold"}>
            {isFullyApproved
              ? "✓ FULLY APPROVED – Live payments and plan joining are UNLOCKED."
              : "⚠️ BLOCKED – Live payment processing and plan joining are guarded pending approvals."}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Legal Seller Name</label>
              <input
                type="text"
                required
                value={config.legalSellerName}
                onChange={(e) => setConfig({ ...config, legalSellerName: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">GSTIN</label>
              <input
                type="text"
                required
                value={config.gstin}
                onChange={(e) => setConfig({ ...config, gstin: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Invoice Issuer Entity</label>
              <input
                type="text"
                required
                value={config.invoiceIssuer}
                onChange={(e) => setConfig({ ...config, invoiceIssuer: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Coin Supplier Entity</label>
              <input
                type="text"
                required
                value={config.coinSupplier}
                onChange={(e) => setConfig({ ...config, coinSupplier: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-stone-700 mb-1">Fulfilment Entity</label>
              <input
                type="text"
                required
                value={config.fulfilmentEntity}
                onChange={(e) => setConfig({ ...config, fulfilmentEntity: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-stone-700 mb-1">Refund-Liable Entity</label>
              <input
                type="text"
                required
                value={config.refundLiableEntity}
                onChange={(e) => setConfig({ ...config, refundLiableEntity: e.target.value })}
                className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-3">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-xs">Approval Sign-Off Flags</h3>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.ownerApproved}
                onChange={(e) => setConfig({ ...config, ownerApproved: e.target.checked })}
                className="h-4 w-4 rounded border-stone-300 text-amber-700"
              />
              <span className="font-semibold text-stone-800">Owner Approval Recorded</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.caApproved}
                onChange={(e) => setConfig({ ...config, caApproved: e.target.checked })}
                className="h-4 w-4 rounded border-stone-300 text-amber-700"
              />
              <span className="font-semibold text-stone-800">Chartered Accountant (CA) Approval Recorded</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={config.legalApproved}
                onChange={(e) => setConfig({ ...config, legalApproved: e.target.checked })}
                className="h-4 w-4 rounded border-stone-300 text-amber-700"
              />
              <span className="font-semibold text-stone-800">Legal Counsel Approval Recorded</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 text-sm transition-all shadow-sm"
          >
            {saving ? "Saving Configuration..." : "Save Merchant Compliance & Sign-Offs &rarr;"}
          </button>
        </form>
      </div>
    </div>
  );
}
