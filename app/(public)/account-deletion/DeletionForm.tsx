"use client";

import { useState, type FormEvent } from "react";

export function DeletionForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/account-deletion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: data.get("identifier"), website: data.get("website") }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Unable to save your request. Please try again."); return; }
      setMessage(result.message); form.reset();
    } catch { setError("Unable to reach RateStack. Please try again or email info@ratestack.in."); }
    finally { setBusy(false); }
  }
  return <div>
    {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">{message}</p> :
      <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
        <div><label htmlFor="deletion-identifier" className="block font-bold">Registered email address or mobile number</label>
          <p id="identifier-help" className="text-sm text-stone-600">Enter one contact detail registered to your account. Do not include passwords, payment details, or identity documents.</p>
          <input id="deletion-identifier" name="identifier" type="text" autoComplete="username" required maxLength={254} aria-describedby="identifier-help" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 focus:outline-2 focus:outline-amber-600" />
        </div>
        <div hidden aria-hidden="true"><label>Leave empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        {error && <p role="alert" className="text-red-800">{error}</p>}
        <button type="submit" disabled={busy} className="rounded-xl bg-amber-700 px-5 py-3 font-bold text-white hover:bg-amber-800 disabled:opacity-60">{busy ? "Submitting…" : "Request Account Deletion"}</button>
      </form>}
  </div>;
}
