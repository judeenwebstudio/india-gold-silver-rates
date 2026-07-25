"use client";

import { useState } from "react";

type AuthModalProps = {
  initialMode?: "login" | "register";
  onClose: () => void;
  onSuccess: () => void;
};

export function AuthModal({ initialMode = "login", onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (!phone || phone.length < 10) {
        setError("Please enter a valid 10-digit mobile number.");
        return;
      }
      if (!password || password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify your confirm password.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone,
            password,
            fullName: fullName.trim() || `Member ${phone.slice(-4)}`,
          }),
        });

        const resData = await res.json();
        if (resData.success) {
          localStorage.setItem("scheme_user_token", resData.data.token);
          localStorage.setItem("ratestack_user_token", resData.data.token);
          onSuccess();
        } else {
          setError(resData.error?.message || "Registration failed. Please try again.");
        }
      } catch (err: any) {
        setError(err.message || "Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      if (!phone) {
        setError("Please enter your registered mobile number.");
        return;
      }
      if (!password) {
        setError("Please enter your password.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: phone,
            password,
          }),
        });

        const resData = await res.json();
        if (resData.success) {
          localStorage.setItem("scheme_user_token", resData.data.token);
          localStorage.setItem("ratestack_user_token", resData.data.token);
          onSuccess();
        } else {
          setError(resData.error?.message || "Invalid credentials. Please check your mobile number and password.");
        }
      } catch (err: any) {
        setError(err.message || "Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-stone-900 border border-amber-500/30 p-6 md:p-8 shadow-2xl space-y-6 text-stone-100">
        <div className="flex justify-between items-center border-b border-stone-800 pb-4">
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
              RateStack Scheme Portal
            </span>
            <h2 className="font-display text-xl font-bold text-stone-100 mt-1">
              {mode === "login" ? "Customer Account Login" : "Register Scheme Account"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 grid place-items-center font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs font-bold text-red-300">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === "register" && (
            <div>
              <label className="block font-bold text-stone-300 mb-1">Full Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block font-bold text-stone-300 mb-1">Mobile Number *</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-stone-300 mb-1">Password *</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block font-bold text-stone-300 mb-1">Confirm Password *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 mt-2"
          >
            {loading
              ? "Authenticating..."
              : mode === "login"
              ? "Login & Access Dashboard →"
              : "Register Account & Continue →"}
          </button>
        </form>

        <div className="pt-4 border-t border-stone-800 text-center text-xs text-stone-400">
          {mode === "login" ? (
            <p>
              Don't have a scheme account?{" "}
              <button
                onClick={() => { setError(null); setMode("register"); }}
                className="font-bold text-amber-400 hover:underline"
              >
                Register Here
              </button>
            </p>
          ) : (
            <p>
              Already registered?{" "}
              <button
                onClick={() => { setError(null); setMode("login"); }}
                className="font-bold text-amber-400 hover:underline"
              >
                Sign In to Account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
