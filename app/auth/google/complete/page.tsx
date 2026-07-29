"use client";

import { useEffect, useState } from "react";

export default function GoogleCompletePage() {
  const [message, setMessage] = useState("Completing Google sign-in…");
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/schemes/dashboard";
    fetch("/api/v1/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => {
        if (!body.success || !body.data?.token) throw new Error();
        localStorage.setItem("scheme_user_token", body.data.token);
        localStorage.setItem("ratestack_user_token", body.data.token);
        if (body.data.user?.fullName) localStorage.setItem("scheme_user_name", body.data.user.fullName);
        if (body.data.user?.phone) localStorage.setItem("scheme_user_phone", body.data.user.phone);
        window.location.replace(safeNext);
      })
      .catch(() => setMessage("Google sign-in could not be completed. Please try again."));
  }, []);
  return <main className="grid min-h-screen place-items-center bg-[#fbfaf7] p-6"><p className="rounded-2xl border bg-white p-6 font-bold text-stone-700 shadow-sm">{message}</p></main>;
}
