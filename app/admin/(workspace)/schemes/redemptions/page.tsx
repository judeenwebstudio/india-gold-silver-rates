"use client";

import { useEffect, useState } from "react";

export default function RedemptionsAdminPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/admin/schemes/reports")
      .then((res) => res.json())
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-stone-900 text-lg">Maturity Redemption Management</h2>
        <p className="text-xs text-stone-500">
          Review accepted quotations, allocate coin serial numbers, and issue final statutory invoices (`INV-2026-XXXXX`).
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider mb-4">
          Active Redemption Orders Queue
        </h3>

        {loading ? (
          <p className="text-xs text-stone-500 animate-pulse">Loading redemption queue...</p>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-500 italic">
            No active redemption orders pending fulfilment approval.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-stone-900 block">{item.invoiceNumber}</span>
                  <span className="text-stone-500 block">Status: {item.fulfillmentStatus}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
