import Link from "next/link";
import Image from "next/image";

import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { LogoutButton } from "@/components/admin/LogoutButton";

type AdminHeaderProps = {
  userEmail: string;
  userName?: string | null;
};

function formatToday() {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

export function AdminHeader({ userEmail, userName }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/90 bg-[#fbfaf7]/95 backdrop-blur-xl">
      <div className="flex min-h-18 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/dashboard" className="shrink-0 lg:hidden" aria-label="RateStack admin dashboard">
            <Image
              src="/ratestack-logo.png"
              alt=""
              width={52}
              height={32}
              className="h-8 w-13 rounded-md border border-stone-200 bg-white object-cover"
            />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-stone-900">Admin workspace</p>
            <p className="truncate text-xs text-stone-500">RateStack</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden text-xs font-semibold text-stone-500 sm:block">{formatToday()}</span>
          <span className="hidden h-6 w-px bg-stone-200 sm:block" />
          <div className="hidden min-w-0 text-right md:block">
            <p className="max-w-48 truncate text-xs font-bold text-stone-800">
              {userName || "Administrator"}
            </p>
            <p className="max-w-48 truncate text-[0.65rem] text-stone-500">{userEmail}</p>
          </div>
          <LogoutButton />

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
