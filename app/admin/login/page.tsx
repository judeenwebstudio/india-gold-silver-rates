import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Admin login interface for India Gold & Silver Rates.",
};

export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-[#f4f1ea] lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[#171411] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-28 -top-24 h-96 w-96 rounded-full border border-amber-300/10" />
        <div className="pointer-events-none absolute -right-8 top-10 h-64 w-64 rounded-full border border-amber-300/15" />

        <Link href="/" className="relative flex items-center gap-3" aria-label="Return to public homepage">
          <span className="grid h-12 w-12 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10 font-display text-base font-bold text-amber-300">
            Au
          </span>
          <span className="leading-tight">
            <span className="block font-display text-xl font-bold">India Gold &amp; Silver</span>
            <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-[0.24em] text-amber-300">
              Administration
            </span>
          </span>
        </Link>

        <div className="relative max-w-xl pb-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Operations workspace</p>
          <h1 className="mt-5 font-display text-5xl leading-[1.08] tracking-[-0.04em]">
            Keep India&apos;s metal-rate data clear and dependable.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-stone-400">
            A focused control center for rates, locations, update history, and system health.
          </p>
        </div>

        <p className="relative text-xs text-stone-500">Internal administration interface · Stage 4A</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden" aria-label="Return to public homepage">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-stone-900 font-display text-sm font-bold text-amber-300">
              Au
            </span>
            <span className="font-display text-lg font-bold text-stone-950">Rates Admin</span>
          </Link>

          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Admin access</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950">Welcome back</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Authentication is intentionally not enabled in this UI stage.
          </p>

          <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="note">
            Credentials entered here are not processed or stored. Secure authentication will be added in a later stage.
          </div>

          <form className="mt-7 space-y-5" aria-label="Admin login preview">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-sm font-bold text-stone-800">
                Email address
              </label>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="admin-password" className="text-sm font-bold text-stone-800">
                  Password
                </label>
                <span className="text-xs font-semibold text-stone-400">Recovery coming later</span>
              </div>
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
              />
            </div>
            <button
              type="button"
              disabled
              className="h-12 w-full cursor-not-allowed rounded-xl bg-stone-300 text-sm font-black text-stone-500"
            >
              Sign in · Authentication pending
            </button>
          </form>

          <div className="mt-8 border-t border-stone-200 pt-6 text-center">
            <Link
              href="/admin/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-800 shadow-sm transition-colors hover:border-amber-500 hover:text-amber-800"
            >
              Preview dashboard
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
