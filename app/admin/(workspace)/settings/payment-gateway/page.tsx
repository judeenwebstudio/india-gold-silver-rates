"use client";

import { useEffect, useState } from "react";

type Gateway = "RAZORPAY" | "PHONEPE";
type Config = {
  activeGateway: Gateway;
  gateways: {
    razorpay: { enabled: boolean; configured: boolean };
    phonepe: { enabled: boolean; configured: boolean; status: string };
  };
};

export default function PaymentGatewaySettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [selected, setSelected] = useState<Gateway>("RAZORPAY");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/payment-gateway", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => { setConfig(data); setSelected(data.activeGateway); })
      .catch(() => setMessage("Unable to load payment gateway settings."));
  }, []);

  async function save() {
    if (!confirm("You are changing the active payment gateway for both Website and Android App. Continue?")) return;
    setMessage("Saving...");
    const res = await fetch("/api/admin/payment-gateway", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeGateway: selected }),
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.error || "Unable to save.");
    setConfig(data);
    setMessage("Payment gateway updated for Website and Android App.");
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-stone-900">Payment Gateway Settings</h1>
        <p className="mt-1 text-sm text-stone-600">One global selection controls website and Android payments.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(["RAZORPAY", "PHONEPE"] as Gateway[]).map((gateway) => {
          const details = gateway === "RAZORPAY" ? config?.gateways.razorpay : config?.gateways.phonepe;
          return (
            <label key={gateway} className={`rounded-2xl border-2 bg-white p-5 ${selected === gateway ? "border-amber-500" : "border-stone-200"}`}>
              <div className="flex items-center gap-3">
                <input type="radio" checked={selected === gateway} onChange={() => setSelected(gateway)} />
                <span className="text-lg font-bold">{gateway === "RAZORPAY" ? "Razorpay" : "PhonePe"}</span>
              </div>
              <div className="mt-4 space-y-1 text-sm text-stone-600">
                <p>{details?.enabled ? "Enabled" : "Disabled"}</p>
                <p>{details?.configured ? "Configured" : "Not configured"}</p>
                <p>{config?.activeGateway === gateway ? "Active" : "Inactive"}</p>
              </div>
              {gateway === "PHONEPE" && config?.gateways.phonepe.status === "BLOCKED_MERCHANT" && (
                <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">
                  PhonePe merchant account is currently blocked. Switch to Razorpay or contact PhonePe support.
                </p>
              )}
            </label>
          );
        })}
      </div>
      <button onClick={save} disabled={!config || selected === config.activeGateway} className="rounded-xl bg-stone-900 px-5 py-3 font-bold text-white disabled:opacity-50">Save</button>
      {message && <p className="text-sm font-semibold text-stone-700">{message}</p>}
    </main>
  );
}
