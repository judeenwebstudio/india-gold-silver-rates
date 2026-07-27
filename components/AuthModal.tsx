"use client";

import { useState, useEffect } from "react";

type AuthModalProps = {
  initialMode?: "login" | "register" | "forgot";
  onClose: () => void;
  onSuccess: () => void;
};

type Mode = "login" | "register" | "forgot_mobile" | "forgot_otp" | "forgot_reset";

export function AuthModal({ initialMode = "login", onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(initialMode === "forgot" ? "forgot_mobile" : initialMode);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  // Forgot password state
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resendTimer, setResendTimer] = useState(45);
  const [canResend, setCanResend] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Timer effect for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === "forgot_otp" && resendTimer > 0) {
      setCanResend(false);
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [mode, resendTimer]);

  const maskPhone = (num: string) => {
    const clean = num.replace(/\D/g, "");
    if (clean.length < 4) return "******" + clean;
    return "******" + clean.slice(-4);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobileNumber: cleanPhone }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || "If an account exists, a verification code has been sent.");
        setMode("forgot_otp");
        setResendTimer(45);
        setCanResend(false);
      } else {
        setError(data.error?.message || "Failed to send OTP.");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!otp || otp.trim().length !== 6) {
      setError("Enter a valid 6-digit verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobileNumber: phone.replace(/\D/g, ""),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.resetToken) {
        setResetToken(data.resetToken);
        setSuccessMessage("OTP verified successfully.");
        setMode("forgot_reset");
      } else {
        setError(data.error?.message || "The verification code is incorrect.");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 8) {
      setError("Use at least 8 characters with a letter and a number.");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Use at least 8 characters with a letter and a number.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToken,
          newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMessage("Password reset successfully. Please login using your new password.");
        setPassword("");
        setOtp("");
        setResetToken("");
        setMode("login");
      } else {
        setError(data.error?.message || "Password reset failed.");
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (mode === "register") {
      if (!fullName || fullName.trim().length < 2) {
        setError("Please enter your full name.");
        return;
      }
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
            fullName: fullName.trim(),
          }),
        });

        const resData = await res.json();
        if (resData.success) {
          localStorage.setItem("scheme_user_token", resData.data.token);
          localStorage.setItem("ratestack_user_token", resData.data.token);
          if (resData.data.user?.fullName) {
            localStorage.setItem("scheme_user_name", resData.data.user.fullName);
          }
          if (resData.data.user?.phone) {
            localStorage.setItem("scheme_user_phone", resData.data.user.phone);
          }
          onSuccess();
          window.location.href = "/schemes/dashboard";
        } else {
          setError(resData.error?.message || "Registration failed. Please try again.");
        }
      } catch (err: any) {
        setError(err.message || "Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    } else if (mode === "login") {
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
          if (resData.data.user?.fullName) {
            localStorage.setItem("scheme_user_name", resData.data.user.fullName);
          }
          if (resData.data.user?.phone) {
            localStorage.setItem("scheme_user_phone", resData.data.user.phone);
          }
          onSuccess();
          window.location.href = "/schemes/dashboard";
        } else {
          setError(resData.error?.message || "Incorrect mobile number or password.");
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
              {mode === "login" && "Customer Account Login"}
              {mode === "register" && "Register Scheme Account"}
              {mode === "forgot_mobile" && "Forgot Password"}
              {mode === "forgot_otp" && "Verify OTP Code"}
              {mode === "forgot_reset" && "Create New Password"}
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

        {successMessage && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs font-bold text-emerald-300">
            ✅ {successMessage}
          </div>
        )}

        {/* LOGIN AND REGISTER MODE */}
        {(mode === "login" || mode === "register") && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === "register" && (
              <div>
                <label className="block font-bold text-stone-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
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
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-stone-300">Password *</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setError(null); setSuccessMessage(null); setMode("forgot_mobile"); }}
                    className="text-amber-400 hover:underline font-semibold text-[11px]"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
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
        )}

        {/* FORGOT STEP 1: MOBILE */}
        {mode === "forgot_mobile" && (
          <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
            <p className="text-stone-400 text-xs leading-relaxed">
              Enter your registered mobile number. We will send an OTP to verify your account.
            </p>

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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? "Sending OTP..." : "Send OTP →"}
            </button>
          </form>
        )}

        {/* FORGOT STEP 2: OTP */}
        {mode === "forgot_otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-stone-300">
              Enter the 6-digit code sent to <strong className="text-amber-400">{maskPhone(phone)}</strong>
            </div>

            <div>
              <label className="block font-bold text-stone-300 mb-1">Verification Code (6 Digits) *</label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className="w-full tracking-widest text-center text-lg rounded-xl bg-stone-950 border border-stone-800 p-3 text-amber-400 font-mono font-bold focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? "Verifying..." : "Verify OTP →"}
            </button>

            <div className="flex justify-between items-center pt-2 text-stone-400">
              <span className="text-[11px]">
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive code?"}
              </span>
              <button
                type="button"
                disabled={!canResend || loading}
                onClick={() => handleSendOtp()}
                className="text-amber-400 hover:underline font-bold text-[11px] disabled:opacity-40"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {/* FORGOT STEP 3: RESET PASSWORD */}
        {mode === "forgot_reset" && (
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-stone-300 mb-1">New Password (Min 8 chars, letter & number) *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-stone-300 mb-1">Confirm New Password *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="w-full rounded-xl bg-stone-950 border border-stone-800 p-3 text-stone-100 font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? "Resetting Password..." : "Reset Password →"}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-stone-800 text-center text-xs text-stone-400">
          {mode === "login" ? (
            <p>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => { setError(null); setSuccessMessage(null); setMode("register"); }}
                className="font-bold text-amber-400 hover:underline"
              >
                Register
              </button>
            </p>
          ) : (
            <p>
              Remember your password?{" "}
              <button
                onClick={() => { setError(null); setSuccessMessage(null); setMode("login"); }}
                className="font-bold text-amber-400 hover:underline"
              >
                Back to Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
