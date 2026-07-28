"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function VerifyEmailContent() {
  const token = useSearchParams().get("token");
  const [message, setMessage] = useState(token ? "Verifying your email address…" : "This verification link is invalid.");
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (!token) return;
    fetch("/api/v1/auth/email/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (res) => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error?.message);
        if (data.data?.token) { localStorage.setItem("scheme_user_token", data.data.token); localStorage.setItem("ratestack_user_token", data.data.token); }
        setSuccess(true); setMessage("Your email is verified. Your RateStack account is ready.");
      })
      .catch((error) => setMessage(error.message || "Verification failed."));
  }, [token]);
  return <main className="mx-auto my-20 max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl"><h1 className="text-2xl font-black">Email Verification</h1><p className="my-5 text-stone-600">{message}</p><Link className="inline-block rounded-xl bg-stone-900 px-5 py-3 font-bold text-white" href={success ? "/schemes/dashboard" : "/schemes"}>{success ? "Open Dashboard" : "Return to Schemes"}</Link></main>;
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="p-8 text-center">Loading verification…</main>}><VerifyEmailContent /></Suspense>;
}
