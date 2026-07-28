"use client";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function EmailResetContent() {
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) return setMessage("Passwords do not match.");
    const res = await fetch("/api/v1/auth/reset-password/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: password }) });
    const data = await res.json(); setMessage(res.ok ? "Password updated. You can now sign in." : data.error?.message || "Reset failed.");
  }
  return <main className="mx-auto my-20 max-w-md rounded-3xl bg-stone-900 p-8 text-white"><h1 className="text-2xl font-black">Create New Password</h1><form onSubmit={submit} className="mt-6 space-y-4"><label className="block">New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl bg-stone-950 p-3" required minLength={8}/></label><label className="block">Confirm password<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 w-full rounded-xl bg-stone-950 p-3" required/></label><button className="w-full rounded-xl bg-amber-500 p-3 font-bold text-stone-950">Reset Password</button>{message && <p className="text-sm">{message}</p>}</form></main>;
}

export default function EmailResetPage() {
  return <Suspense fallback={<main className="p-8 text-center">Loading password reset…</main>}><EmailResetContent /></Suspense>;
}
