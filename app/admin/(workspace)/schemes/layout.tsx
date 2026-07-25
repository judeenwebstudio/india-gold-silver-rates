import Link from "next/link";

export default function SchemesAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      {/* Schemes Admin Sub-Header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-lg font-bold text-stone-900">
            Gold &amp; Silver Savings Scheme Administration
          </h1>
          <p className="text-xs text-stone-500">
            Manage scheme plans, merchant compliance, maker-checker payments, redemptions, and reports
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <Link
            href="/admin/schemes/dashboard"
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-stone-700 hover:bg-amber-50 hover:text-amber-900"
          >
            Dashboard
          </Link>
          <Link
            href="/admin/schemes/merchant-config"
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-stone-700 hover:bg-amber-50 hover:text-amber-900"
          >
            Merchant Compliance
          </Link>
          <Link
            href="/admin/schemes/manual-payments"
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-stone-700 hover:bg-amber-50 hover:text-amber-900"
          >
            Maker-Checker Payments
          </Link>
          <Link
            href="/admin/schemes/redemptions"
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-stone-700 hover:bg-amber-50 hover:text-amber-900"
          >
            Redemptions
          </Link>
          <Link
            href="/admin/schemes/reports"
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-stone-700 hover:bg-amber-50 hover:text-amber-900"
          >
            Financial Reports
          </Link>
        </nav>
      </div>

      {children}
    </div>
  );
}
