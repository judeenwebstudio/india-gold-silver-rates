"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function JoinSchemePage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Auth State
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("REGISTER");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Scheme Join State
  const initialAmount = parseFloat(searchParams.get("amount") || "1000");
  const [monthlyAmount, setMonthlyAmount] = useState<number>(initialAmount);
  const [nomineeFullName, setNomineeFullName] = useState("");
  const [nomineeRelationship, setNomineeRelationship] = useState("Spouse");
  const [nomineePhone, setNomineePhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("ratestack_user_token");
    if (savedToken) {
      setAuthToken(savedToken);
    }

    fetch("/api/v1/schemes")
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data?.plans) {
          const found = res.data.plans.find((p: any) => p.id === planId);
          if (found) {
            setPlan(found);
            if (!initialAmount || initialAmount < found.minMonthlyAmount) {
              setMonthlyAmount(found.minMonthlyAmount);
            }
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [planId, initialAmount]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const endpoint = authMode === "REGISTER" ? "/api/v1/auth/register" : "/api/v1/auth/login";
      const payload = authMode === "REGISTER" ? { fullName, phone, password } : { identifier: phone, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Authentication failed");
      }

      localStorage.setItem("ratestack_user_token", data.data.token);
      setAuthToken(data.data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      setError("You must accept the scheme terms & conditions to proceed.");
      return;
    }
    if (!authToken) {
      setError("Please sign in or create an account first.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/v1/schemes/${planId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          monthlyAmount,
          nomineeFullName,
          nomineeRelationship,
          nomineePhone,
          acceptedTermsVersion: plan?.termsVersion || "v1.0-2026",
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error?.message || "Failed to join scheme");
      }

      router.push(`/schemes/dashboard/${data.data.enrollmentId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans grid place-items-center">
        <p className="animate-pulse text-stone-500 font-medium">Loading scheme details...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans grid place-items-center">
        <p className="text-stone-600 font-bold">Scheme Plan Not Found</p>
      </div>
    );
  }

  const tenure = plan.tenureMonths;
  const totalScheduled = monthlyAmount * tenure;

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/schemes" className="text-xs font-bold text-amber-800 hover:underline">
            &larr; Back to Schemes
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Step 2 of 2: Join Scheme
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Plan Summary Card */}
          <div className="md:col-span-1 space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 space-y-4 shadow-sm">
              <h2 className="font-display text-lg font-bold text-stone-900">{plan.name}</h2>
              <div className="space-y-2 text-xs border-t border-amber-200/80 pt-3 text-stone-600">
                <div className="flex justify-between">
                  <span>Tenure</span>
                  <span className="font-bold text-stone-900">{tenure} Months</span>
                </div>
                <div className="flex justify-between">
                  <span>Monthly Contribution</span>
                  <span className="font-bold text-stone-900">₹{monthlyAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-amber-200/80">
                  <span className="font-bold text-stone-800">Total Scheduled Amount</span>
                  <span className="font-extrabold text-amber-900 text-sm">
                    ₹{totalScheduled.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
              <div className="text-[0.7rem] text-stone-500 leading-relaxed bg-white/70 p-3 rounded-lg border border-amber-200/50">
                🛡️ <strong>Note:</strong> Non-withdrawable coin purchase plan. Redeemable only towards {plan.metalType === "GOLD" ? "22K Gold" : "999 Silver"} coins.
              </div>
            </div>
          </div>

          {/* Form Area */}
          <div className="md:col-span-2 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800">
                ⚠️ {error}
              </div>
            )}

            {!authToken ? (
              /* User Authentication Required */
              <div className="space-y-6">
                <div className="border-b border-stone-100 pb-4">
                  <h3 className="font-bold text-stone-900 text-base">Account Authentication Required</h3>
                  <p className="text-xs text-stone-500 mt-1">Sign in or register to secure your scheme account</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode("REGISTER")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border ${
                      authMode === "REGISTER" ? "bg-amber-700 text-white border-amber-700" : "bg-stone-50 text-stone-700"
                    }`}
                  >
                    New Member (Register)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode("LOGIN")}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border ${
                      authMode === "LOGIN" ? "bg-amber-700 text-white border-amber-700" : "bg-stone-50 text-stone-700"
                    }`}
                  >
                    Existing Member (Login)
                  </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  {authMode === "REGISTER" && (
                    <div>
                      <label className="block text-xs font-bold text-stone-600 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="As per Government ID"
                        className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-semibold focus:border-amber-600 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Mobile Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-semibold focus:border-amber-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Account Password / PIN</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-semibold focus:border-amber-600 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 text-sm transition-all"
                  >
                    {submitting ? "Authenticating..." : authMode === "REGISTER" ? "Create Account & Continue" : "Sign In & Continue"}
                  </button>
                </form>
              </div>
            ) : (
              /* Scheme Enrollment Details Form */
              <form onSubmit={handleJoinScheme} className="space-y-6">
                <div className="border-b border-stone-100 pb-4">
                  <h3 className="font-bold text-stone-900 text-base">Scheme Account Details &amp; Nominee</h3>
                  <p className="text-xs text-stone-500 mt-1">Configure your monthly contribution and nominee information</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">
                    Monthly Contribution (₹{plan.minMonthlyAmount} – ₹{plan.maxMonthlyAmount})
                  </label>
                  <input
                    type="number"
                    min={plan.minMonthlyAmount}
                    max={plan.maxMonthlyAmount}
                    value={monthlyAmount}
                    onChange={(e) => setMonthlyAmount(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-semibold focus:border-amber-600 focus:outline-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Nominee Full Name</label>
                    <input
                      type="text"
                      required
                      value={nomineeFullName}
                      onChange={(e) => setNomineeFullName(e.target.value)}
                      placeholder="Nominee full name"
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-semibold focus:border-amber-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Relationship</label>
                    <select
                      value={nomineeRelationship}
                      onChange={(e) => setNomineeRelationship(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-semibold focus:border-amber-600 focus:outline-none"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Child">Child</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1">Nominee Phone (Optional)</label>
                  <input
                    type="tel"
                    value={nomineePhone}
                    onChange={(e) => setNomineePhone(e.target.value)}
                    placeholder="Nominee phone number"
                    className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-sm font-semibold focus:border-amber-600 focus:outline-none"
                  />
                </div>

                {/* Terms Acceptance */}
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600"
                    />
                    <span className="text-xs text-stone-600 leading-relaxed">
                      I have read, understood, and accept the RateStack Coin Savings Scheme Terms (Version {plan.termsVersion}). I confirm that this is an amount-wallet coin purchase savings scheme, non-withdrawable, non-interest bearing, and redeemable strictly towards {plan.metalType === "GOLD" ? "22K Gold" : "999 Silver"} coins.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 text-sm transition-all shadow-sm"
                >
                  {submitting ? "Creating Scheme Account..." : "Confirm & Open Scheme Account &rarr;"}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
