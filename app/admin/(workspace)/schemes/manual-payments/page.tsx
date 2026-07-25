"use client";

import { useEffect, useState } from "react";

export default function ManualPaymentsAdminPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Maker form state
  const [showMakerModal, setShowMakerModal] = useState(false);
  const [makerEnrollmentId, setMakerEnrollmentId] = useState("");
  const [makerAmount, setMakerAmount] = useState("1000");
  const [makerMode, setMakerMode] = useState<"CASH" | "BANK_TRANSFER" | "CHEQUE" | "POS">("CASH");
  const [makerRef, setMakerRef] = useState("");

  const loadQueue = () => {
    fetch("/api/v1/admin/schemes/reports") // Load dashboard items
      .then((res) => res.json())
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleMakerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingId("maker");
    setMsg(null);

    try {
      const res = await fetch("/api/v1/admin/schemes/manual-payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrollmentId: makerEnrollmentId,
          amount: parseFloat(makerAmount),
          paymentMode: makerMode,
          referenceNumber: makerRef,
        }),
      });

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error?.message || "Failed to create manual entry");
      }

      setMsg("Manual payment entry created by Maker. Pending Checker review.");
      setShowMakerModal(false);
      loadQueue();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCheckerAction = async (queueId: string, action: "APPROVE" | "REJECT") => {
    setProcessingId(queueId);
    setMsg(null);

    try {
      const res = await fetch("/api/v1/admin/schemes/manual-payment/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueId, action }),
      });

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error?.message || "Checker action failed");
      }

      setMsg(resData.data?.message || `Manual payment ${action.toLowerCase()}d successfully`);
      loadQueue();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-stone-900 text-lg">Maker-Checker Manual Payment Administration</h2>
          <p className="text-xs text-stone-500">
            Offline cash, cheque, POS, and bank transfer entries. Self-approval is strictly forbidden.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowMakerModal(true)}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs"
        >
          + Entry New Manual Payment (Maker)
        </button>
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

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider mb-4">Pending Approvals Queue</h3>

        {loading ? (
          <p className="text-xs text-stone-500 animate-pulse">Loading manual payment queue...</p>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500 italic">
            No manual payment entries currently pending checker approval.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900 block">
                    {item.paymentMode} - ₹{item.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-stone-500 block">
                    Account: {item.accountNumber} | Ref: {item.referenceNumber || "N/A"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={processingId === item.id}
                    onClick={() => handleCheckerAction(item.id, "APPROVE")}
                    className="px-3 py-1 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800"
                  >
                    Approve (Checker)
                  </button>
                  <button
                    type="button"
                    disabled={processingId === item.id}
                    onClick={() => handleCheckerAction(item.id, "REJECT")}
                    className="px-3 py-1 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Maker Entry Modal */}
      {showMakerModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3">
              <h3 className="font-bold text-stone-900 text-base">New Manual Payment Entry (Maker)</h3>
              <button onClick={() => setShowMakerModal(false)} className="text-stone-400 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleMakerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Scheme Enrollment ID</label>
                <input
                  type="text"
                  required
                  placeholder="Paste Enrollment ID"
                  value={makerEnrollmentId}
                  onChange={(e) => setMakerEnrollmentId(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={makerAmount}
                  onChange={(e) => setMakerAmount(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Payment Mode</label>
                <select
                  value={makerMode}
                  onChange={(e: any) => setMakerMode(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
                >
                  <option value="CASH">CASH</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="POS">POS CARD SLIP</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Reference / UTR / Cheque No</label>
                <input
                  type="text"
                  value={makerRef}
                  onChange={(e) => setMakerRef(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={processingId === "maker"}
                className="w-full rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 transition-all"
              >
                {processingId === "maker" ? "Submitting Entry..." : "Submit for Checker Approval &rarr;"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
