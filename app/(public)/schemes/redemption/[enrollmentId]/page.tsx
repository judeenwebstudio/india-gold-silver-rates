"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function RedemptionRequestPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>;
}) {
  const { enrollmentId } = use(params);

  const [dashboard, setDashboard] = useState<any>(null);
  const [denominations, setDenominations] = useState<any[]>([]);
  const [selectedDenomId, setSelectedDenomId] = useState<string>("");
  const [collectionMethod, setCollectionMethod] = useState<"SHOWROOM_COLLECTION" | "HOME_DELIVERY">("SHOWROOM_COLLECTION");

  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingQuote, setGeneratingQuote] = useState(false);
  const [acceptingQuote, setAcceptingQuote] = useState(false);
  const [acceptedSuccess, setAcceptedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("ratestack_user_token");
    if (!token) {
      setLoading(false);
      return;
    }

    // Fetch dashboard and scheme plans
    Promise.all([
      fetch(`/api/v1/me/schemes/${enrollmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((r) => r.json()),
      fetch("/api/v1/schemes").then((r) => r.json()),
    ])
      .then(([dashRes, schemesRes]) => {
        if (dashRes.success) {
          setDashboard(dashRes.data);
          if (schemesRes.success && schemesRes.data?.plans) {
            const foundPlan = schemesRes.data.plans.find(
              (p: any) => p.metalType === dashRes.data.metalType
            );
            if (foundPlan?.coinDenominations) {
              setDenominations(foundPlan.coinDenominations);
              if (foundPlan.coinDenominations.length > 0) {
                setSelectedDenomId(foundPlan.coinDenominations[0].id);
              }
            }
          }
        } else {
          setError(dashRes.error?.message || "Failed to load redemption details");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [enrollmentId]);

  const handleGenerateQuotation = async () => {
    const token = localStorage.getItem("ratestack_user_token");
    if (!token || !selectedDenomId) return;

    setError(null);
    setGeneratingQuote(true);

    try {
      const res = await fetch(`/api/v1/me/schemes/${enrollmentId}/redemption/quotation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          denominationId: selectedDenomId,
          collectionMethod,
        }),
      });

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error?.message || "Failed to generate quotation");
      }

      setQuotation(resData.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingQuote(false);
    }
  };

  const handleAcceptQuotation = async () => {
    const token = localStorage.getItem("ratestack_user_token");
    if (!token || !quotation) return;

    setError(null);
    setAcceptingQuote(true);

    try {
      const res = await fetch(`/api/v1/me/schemes/${enrollmentId}/redemption/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quotationNumber: quotation.quotationNumber,
        }),
      });

      const resData = await res.json();
      if (!resData.success) {
        throw new Error(resData.error?.message || "Failed to accept quotation");
      }

      setAcceptedSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAcceptingQuote(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans grid place-items-center">
        <p className="animate-pulse text-stone-500 font-medium">Loading maturity redemption portal...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans">
        <Header />
        <main className="mx-auto max-w-xl py-20 text-center px-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 text-sm font-bold">
            ⚠️ {error || "Redemption request not available."}
          </div>
          <div className="mt-6">
            <Link href={`/schemes/dashboard/${enrollmentId}`} className="text-xs font-bold text-amber-800 underline">
              &larr; Return to Scheme Dashboard
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/schemes/dashboard/${enrollmentId}`} className="text-xs font-bold text-amber-800 underline">
              &larr; Back to Dashboard
            </Link>
            <h1 className="font-display text-2xl font-bold text-stone-900 mt-2">
              Maturity Coin Redemption Request
            </h1>
            <p className="text-xs text-stone-500">
              Account #{dashboard.accountNumber} | Eligible Purchase Balance: ₹
              {dashboard.schemePurchaseBalance.toLocaleString("en-IN")}
            </p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
            Matured Status Verified
          </span>
        </div>

        {acceptedSuccess ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-8 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-emerald-200 text-emerald-800 font-bold grid place-items-center text-xl mx-auto">
              ✓
            </div>
            <h2 className="font-display text-xl font-bold text-emerald-950">
              Redemption Quotation Accepted Successfully!
            </h2>
            <p className="text-xs text-emerald-800 max-w-lg mx-auto leading-relaxed">
              Your quotation (Quotation #{quotation.quotationNumber}) has been accepted. Our operations hub is processing your stock allocation and preparing the final invoice.
            </p>
            <div className="pt-4">
              <Link
                href={`/schemes/dashboard/${enrollmentId}`}
                className="inline-block px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs"
              >
                Return to Scheme Dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Selection Form */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="font-bold text-stone-900 text-base border-b border-stone-100 pb-3">
                1. Select Coin Denomination &amp; Fulfilment
              </h2>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800">
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-2">
                  Select {dashboard.metalType === "GOLD" ? "22K Gold" : "999 Silver"} Coin Weight
                </label>
                <div className="space-y-2">
                  {denominations.map((d) => (
                    <label
                      key={d.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                        selectedDenomId === d.id
                          ? "border-amber-600 bg-amber-50/50 text-stone-900 font-bold"
                          : "border-stone-200 text-stone-700 hover:bg-stone-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="denomination"
                          checked={selectedDenomId === d.id}
                          onChange={() => setSelectedDenomId(d.id)}
                          className="text-amber-700 focus:ring-amber-600"
                        />
                        <span>{d.title}</span>
                      </div>
                      <span className="text-stone-500">Minting: ₹{d.mintingFee}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-2">Fulfilment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCollectionMethod("SHOWROOM_COLLECTION")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      collectionMethod === "SHOWROOM_COLLECTION"
                        ? "border-amber-700 bg-amber-700 text-white shadow-sm"
                        : "border-stone-200 bg-stone-50 text-stone-700"
                    }`}
                  >
                    🏛️ Showroom Collection (Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCollectionMethod("HOME_DELIVERY")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      collectionMethod === "HOME_DELIVERY"
                        ? "border-amber-700 bg-amber-700 text-white shadow-sm"
                        : "border-stone-200 bg-stone-50 text-stone-700"
                    }`}
                  >
                    📦 Insured Home Delivery (+₹250)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateQuotation}
                disabled={generatingQuote}
                className="w-full rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 text-sm transition-all shadow-sm"
              >
                {generatingQuote ? "Calculating Server Quotation..." : "Generate Live Server Quotation &rarr;"}
              </button>
            </div>

            {/* Server Quotation Card */}
            <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/60 to-white p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-stone-900 text-base border-b border-amber-200 pb-3 flex items-center justify-between">
                <span>2. Official Server Quotation</span>
                {quotation && (
                  <span className="text-[0.65rem] bg-amber-200/80 px-2 py-0.5 rounded text-amber-900 font-semibold">
                    Valid for 15 mins
                  </span>
                )}
              </h2>

              {!quotation ? (
                <div className="py-16 text-center text-xs text-stone-500 italic leading-relaxed">
                  Select a coin denomination and click "Generate Live Server Quotation" to see prevailing metal rates, statutory GST (3%), minting fees, and difference payable.
                </div>
              ) : (
                <div className="space-y-3 text-xs text-stone-700">
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-amber-200/60">
                    <span className="text-stone-500">Quotation No / Source</span>
                    <span className="font-bold text-stone-900">
                      {quotation.quotationNumber} ({quotation.rateSource})
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Prevailing Rate:</span>
                    <span className="font-bold">₹{quotation.ratePerGram.toLocaleString("en-IN")}/g</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Coin Weight:</span>
                    <span className="font-bold">{quotation.selectedWeightGrams} Grams</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Metal Value:</span>
                    <span>₹{quotation.metalValue.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Minting &amp; Packaging:</span>
                    <span>₹{(quotation.mintingCharges + quotation.packagingCharges).toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Statutory GST (3%):</span>
                    <span>₹{quotation.gstAmount.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Delivery Charges:</span>
                    <span>₹{quotation.deliveryCharges.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="pt-2 border-t border-amber-200 flex justify-between font-bold text-stone-900 text-sm">
                    <span>Total Gross Price:</span>
                    <span>₹{quotation.totalGrossValue.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Less Scheme Purchase Balance Applied:</span>
                    <span>- ₹{quotation.schemePurchaseBalanceApplied.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="pt-2 border-t border-amber-300 flex justify-between font-extrabold text-base text-amber-950">
                    <span>Net Difference Payable:</span>
                    <span>₹{quotation.netDifferencePayable.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleAcceptQuotation}
                      disabled={acceptingQuote}
                      className="w-full rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold py-3 text-sm transition-all shadow-sm"
                    >
                      {acceptingQuote ? "Accepting Quotation..." : "Accept Quotation & Proceed &rarr;"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
