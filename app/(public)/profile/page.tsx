"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

type Profile = {
  fullName: string; phone: string | null; email: string | null; emailVerified: boolean;
  googleConnected: boolean; googleEmail: string | null; lastLoginAt: string | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const token = typeof window === "undefined" ? "" : localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token") || "";
  const load = useCallback(
    () => fetch("/api/v1/me/profile", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((response) => response.json())
      .then((body) => body.success ? setProfile(body.data) : setMessage("Please sign in to view Profile Settings.")),
    [token],
  );
  useEffect(() => { void load(); }, [load]);
  async function disconnectGoogle() {
    setMessage("");
    const response = await fetch("/api/v1/me/profile", { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const body = await response.json();
    if (!body.success) return setMessage(body.error?.message || "Google account could not be disconnected.");
    setMessage("Google account disconnected.");
    await load();
  }
  async function connectGoogle() {
    const response = await fetch("/api/v1/auth/session", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) return setMessage("Please sign in again before connecting Google.");
    window.location.assign("/api/auth/google?mode=connect&next=/profile");
  }
  return <div className="min-h-screen bg-[#fbfaf7]"><Header/><main className="mx-auto max-w-3xl px-4 py-12"><h1 className="font-display text-3xl font-bold">Profile Settings</h1>{message && <p className="mt-4 rounded-xl border bg-white p-4 text-sm font-semibold">{message}</p>}{profile && <section className="mt-6 space-y-5 rounded-3xl border bg-white p-6 shadow-sm"><div><p className="font-bold">{profile.fullName}</p><p className="text-sm text-stone-600">{profile.email || profile.phone || "No contact method added"}</p></div><div className="rounded-2xl border bg-stone-50 p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-bold">Google account: {profile.googleConnected ? "Connected" : "Not Connected"}</h2><p className="text-sm text-stone-600">{profile.googleEmail || "Connect Google for faster secure sign-in."}</p></div>{profile.googleConnected ? <button onClick={disconnectGoogle} className="rounded-xl border border-red-200 bg-white px-4 py-2 font-bold text-red-700">Disconnect Google Account</button> : <button onClick={connectGoogle} className="rounded-xl bg-stone-900 px-4 py-2 font-bold text-white">Connect Google Account</button>}</div></div></section>}</main><Footer/></div>;
}
