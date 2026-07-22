import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "States", description: "State coverage for city bullion pricing." };
export const dynamic = "force-dynamic";

export default async function StatesPage() {
  const states = await prisma.state.findMany({
    include: {
      _count: { select: { cities: true } },
      cities: { select: { isActive: true, deletedAt: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-[96rem]">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Location coverage</p><h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950 sm:text-5xl">States</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">Review state availability and the public city coverage within each state.</p></div>
        <Link href="/admin/cities?mode=add" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-black text-white hover:bg-amber-800">Add City</Link>
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="State records">
        {states.map((state) => {
          const activeCities = state.cities.filter((city) => city.isActive && !city.deletedAt).length;
          return <article key={state.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">{state.code}</p><h2 className="mt-2 font-display text-2xl font-bold text-stone-950">{state.name}</h2></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${state.isActive ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>{state.isActive ? "Active" : "Inactive"}</span></div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-stone-100 pt-4"><div><p className="text-xs text-stone-500">Active cities</p><p className="mt-1 text-xl font-bold text-stone-900">{activeCities}</p></div><div><p className="text-xs text-stone-500">All records</p><p className="mt-1 text-xl font-bold text-stone-900">{state._count.cities}</p></div></div>
            <Link href={`/admin/cities?state=${state.id}`} className="mt-5 inline-flex text-sm font-bold text-amber-800 hover:text-amber-950">View cities →</Link>
          </article>;
        })}
      </section>
    </div>
  );
}
