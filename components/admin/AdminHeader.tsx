import Link from "next/link";

import { AdminNavigation } from "@/components/admin/AdminNavigation";

function formatToday() {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/90 bg-[#fbfaf7]/95 backdrop-blur-xl">
      <div className="flex min-h-18 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/dashboard" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-900 font-display text-xs font-bold text-amber-300 lg:hidden">
            Au
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-stone-900">Admin workspace</p>
            <p className="truncate text-xs text-stone-500">India Gold &amp; Silver Rates</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden text-xs font-semibold text-stone-500 sm:block">{formatToday()}</span>
          <span className="hidden h-6 w-px bg-stone-200 sm:block" />
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-amber-800">
            UI only
          </span>

          <details className="group relative lg:hidden">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 marker:content-none">
              <span aria-hidden="true" className="space-y-1">
                <span className="block h-0.5 w-4 bg-stone-700" />
                <span className="block h-0.5 w-4 bg-stone-700" />
                <span className="block h-0.5 w-4 bg-stone-700" />
              </span>
              Menu
            </summary>
            <div className="absolute right-0 top-12 w-72 rounded-2xl border border-stone-200 bg-white p-3 shadow-2xl shadow-stone-900/15">
              <AdminNavigation variant="light" />
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
