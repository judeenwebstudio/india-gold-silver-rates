import Link from "next/link";

import { AdminNavigation } from "@/components/admin/AdminNavigation";

export function AdminSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col overflow-y-auto bg-[#171411] text-white lg:flex">
      <div className="border-b border-white/10 px-6 py-6">
        <Link href="/admin/dashboard" className="flex items-center gap-3" aria-label="Admin dashboard home">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-amber-300/25 bg-amber-300/10 font-display text-sm font-bold text-amber-300">
            Au
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-bold tracking-tight">Rates Admin</span>
            <span className="mt-1 block text-[0.6rem] font-bold uppercase tracking-[0.22em] text-stone-400">
              India metals desk
            </span>
          </span>
        </Link>
      </div>

      <div className="flex-1 px-4 py-6">
        <p className="mb-3 px-3 text-[0.62rem] font-black uppercase tracking-[0.2em] text-stone-500">
          Workspace
        </p>
        <AdminNavigation />
      </div>

      <div className="m-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.1)]" />
          Data layer connected
        </div>
        <p className="mt-2 text-xs leading-5 text-stone-400">PostgreSQL records through Prisma ORM</p>
      </div>
    </aside>
  );
}
