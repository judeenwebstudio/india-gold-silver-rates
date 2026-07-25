import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function SchemeTermsPage() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-stone-900 font-sans">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        {/* Compliance Header */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6 space-y-2">
          <span className="inline-block rounded-full bg-amber-200 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-amber-900">
            Official Policy Document • Draft Version v1.0-2026
          </span>
          <h1 className="font-display text-2xl font-extrabold text-stone-900">
            Gold &amp; Silver Coin Savings Scheme Terms &amp; Policies
          </h1>
          <p className="text-xs text-amber-900 leading-relaxed font-semibold">
            ⚠️ <strong>Admin / Legal Notice:</strong> These terms are administrative placeholders. Live payment processing and plan enrollment remain guarded until final owner, CA, and legal counsel approval is recorded in system settings.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-8 text-xs text-stone-700 leading-relaxed">
          <section className="space-y-2">
            <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
              1. Scheme Model &amp; Non-Financial Nature
            </h2>
            <p>
              The RateStack Gold and Silver Coin Savings Scheme is an <strong>amount-wallet coin purchase plan</strong> designed exclusively to enable customers to purchase hallmarked 22K Gold (916) and Silver (999) coins through regular monthly contributions.
            </p>
            <p>
              This scheme is <strong>NOT a banking deposit, NBFC product, chit fund, or financial investment</strong>. No interest, bonus, dividend, or guaranteed monetary appreciation is offered or guaranteed under any circumstances.
            </p>
          </section>

          <section className="space-y-2 border-t border-stone-100 pt-6">
            <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
              2. Non-Withdrawable &amp; Non-Transferable Balance
            </h2>
            <p>
              All verified contributions are accumulated as <strong>Scheme Purchase Balance</strong> (Eligible Purchase Value). This balance is strictly <strong>non-withdrawable as cash, non-transferable to another person or account, and non-peer-to-peer transferable</strong>.
            </p>
            <p>
              The balance can only be redeemed towards the purchase of the chosen coin category (22K Gold Coin for Gold schemes, Silver 999 Coin for Silver schemes) upon maturity.
            </p>
          </section>

          <section className="space-y-2 border-t border-stone-100 pt-6">
            <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
              3. Payment Due &amp; Grace Period Policy
            </h2>
            <p>
              Monthly installments are due on the scheduled due date each month. A standard <strong>7-day grace period</strong> is allowed for late payments. No arbitrary monetary penalties are levied for delayed payments within the grace period.
            </p>
          </section>

          <section className="space-y-2 border-t border-stone-100 pt-6">
            <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
              4. Maturity, Pricing &amp; Redemption Terms
            </h2>
            <p>
              Upon completion of the scheduled tenure (10, 12, or 16 months), the scheme account reaches <strong>MATURED</strong> status. Auto-redemption is not practiced.
            </p>
            <p>
              Redemption requires the generation of an official <strong>Server Redemption Quotation</strong> based on the prevailing benchmark market rate at the exact time of quotation request. Quotations are valid for 15 minutes and include itemized breakdowns of metal value, statutory GST (3%), minting fees, packaging fees, delivery charges, applied balance, and any net difference payable by the user.
            </p>
          </section>

          <section className="space-y-2 border-t border-stone-100 pt-6">
            <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
              5. Coin Purity &amp; Hallmark Guarantee
            </h2>
            <p>
              All gold coins delivered under this scheme are guaranteed <strong>22K (916 purity) BIS Hallmarked</strong>. All silver coins delivered are guaranteed <strong>999 Fine Pure Silver</strong> accompanied by tamper-evident assay certification.
            </p>
          </section>

          <section className="space-y-2 border-t border-stone-100 pt-6">
            <h2 className="font-bold text-stone-900 text-sm uppercase tracking-wider">
              6. Cancellation &amp; Refund Policy
            </h2>
            <p>
              In the event of user-requested cancellation prior to maturity, refunds require admin review and payment gateway reconciliation. Refunds are credited back strictly to the original funding source/bank account. Reversal entries are posted to the immutable ledger.
            </p>
          </section>
        </div>

        <div className="text-center">
          <Link href="/schemes" className="text-xs font-bold text-amber-800 underline">
            &larr; Return to Scheme Products Listing
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
