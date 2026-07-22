import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";

import { CityForm } from "@/components/admin/cities/CityForm";
import { DeleteCityButton } from "@/components/admin/cities/DeleteCityButton";
import { RatePagination } from "@/components/admin/rates/RatePagination";
import { CITY_ADJUSTMENT_FIELDS, getCityAdjustmentLimit } from "@/lib/city-adjustments";
import type { EditableCity } from "@/lib/city-management";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Cities", description: "Manage city-specific bullion rate adjustments." };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function param(params: Record<string, string | string[] | undefined>, name: string) {
  const value = params[name];
  return typeof value === "string" ? value.trim() : "";
}

const notices: Record<string, string> = {
  created: "City created successfully. Its display rates are now calculated from national rates plus these adjustments.",
  updated: "City and purity-wise adjustments updated successfully.",
  deleted: "City soft deleted successfully. It remains stored and no longer appears publicly.",
};

function money(value: { toString(): string }) {
  const number = Number(value);
  return `${number > 0 ? "+" : ""}₹${number.toLocaleString("en-IN", { maximumFractionDigits: 4 })}`;
}

export default async function CitiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = param(params, "q").slice(0, 100);
  const stateId = param(params, "state");
  const editId = param(params, "edit");
  const showAddForm = param(params, "mode") === "add";
  const requestedPage = Math.max(1, Number.parseInt(param(params, "page"), 10) || 1);
  const notice = notices[param(params, "notice")];
  const filters: Prisma.CityWhereInput[] = [];
  if (stateId) filters.push({ stateId });
  if (query) {
    filters.push({ OR: [
      { name: { contains: query, mode: "insensitive" } },
      { state: { name: { contains: query, mode: "insensitive" } } },
    ] });
  }
  const where: Prisma.CityWhereInput = filters.length > 0 ? { AND: filters } : {};

  const [states, totalRecords, activeCount, deletedCount] = await Promise.all([
    prisma.state.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.city.count({ where }),
    prisma.city.count({ where: { isActive: true, deletedAt: null } }),
    prisma.city.count({ where: { deletedAt: { not: null } } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const [cities, editing] = await Promise.all([
    prisma.city.findMany({
      where,
      include: { state: true },
      orderBy: [{ state: { name: "asc" } }, { name: "asc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    editId
      ? prisma.city.findFirst({ where: { id: editId, deletedAt: null }, select: {
          id: true, name: true, stateId: true, gold24KAdjustment: true, gold22KAdjustment: true,
          gold18KAdjustment: true, gold14KAdjustment: true, silver999Adjustment: true, isActive: true,
        } })
      : Promise.resolve(null),
  ]);
  const editableCity: EditableCity | undefined = editing ? {
    ...editing,
    gold24KAdjustment: editing.gold24KAdjustment.toString(),
    gold22KAdjustment: editing.gold22KAdjustment.toString(),
    gold18KAdjustment: editing.gold18KAdjustment.toString(),
    gold14KAdjustment: editing.gold14KAdjustment.toString(),
    silver999Adjustment: editing.silver999Adjustment.toString(),
  } : undefined;
  const paginationParams = Object.fromEntries(Object.entries({ q: query, state: stateId }).filter(([, value]) => value));

  return (
    <div className="mx-auto max-w-[96rem]">
      {notice && <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-900" role="status">{notice}</div>}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Location pricing</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950 sm:text-5xl">Cities</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">Manage active locations and signed per-gram adjustments. No city rate rows are created by this module.</p>
        </div>
        <Link href="/admin/cities?mode=add" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-black text-white hover:bg-amber-800">Add City</Link>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="City totals">
        {[["All cities", activeCount + deletedCount], ["Active publicly", activeCount], ["Soft deleted", deletedCount]].map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm"><p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-stone-500">{label}</p><p className="mt-2 font-display text-3xl font-bold text-stone-950">{Number(value).toLocaleString("en-IN")}</p></article>
        ))}
      </section>

      {(showAddForm || editId) && <div className="mt-7">
        {editId && !editableCity
          ? <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">That editable city could not be found.</div>
          : <CityForm states={states} city={editableCity} adjustmentLimit={getCityAdjustmentLimit()} />}
      </div>}

      <form action="/admin/cities" method="get" className="mt-7 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_auto] md:items-end">
          <label><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-500">Search cities</span><input name="q" type="search" defaultValue={query} placeholder="City or state" className="h-11 w-full rounded-xl border border-stone-300 px-3 text-sm" /></label>
          <label><span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-stone-500">State</span><select name="state" defaultValue={stateId} className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm"><option value="">All states</option>{states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}</select></label>
          <div className="flex gap-2"><button className="min-h-11 rounded-xl bg-stone-900 px-4 text-sm font-black text-white">Apply</button><Link href="/admin/cities" className="inline-flex min-h-11 items-center rounded-xl border border-stone-300 px-4 text-sm font-bold text-stone-600">Clear</Link></div>
        </div>
      </form>

      <section className="mt-7 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm" aria-label="City adjustment records">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-stone-950 text-xs uppercase tracking-wider text-stone-300"><tr><th className="px-5 py-4">City</th>{CITY_ADJUSTMENT_FIELDS.map((field) => <th key={field.key} className="px-4 py-4">{field.label}</th>)}<th className="px-4 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-stone-100">
              {cities.map((city) => <tr key={city.id} className="align-top hover:bg-amber-50/40">
                <td className="px-5 py-4"><p className="font-bold text-stone-950">{city.name}</p><p className="mt-1 text-xs text-stone-500">{city.state.name}</p></td>
                {CITY_ADJUSTMENT_FIELDS.map((field) => <td key={field.key} className="px-4 py-4 font-semibold text-stone-700">{money(city[field.key])}</td>)}
                <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${city.isActive && !city.deletedAt ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"}`}>{city.deletedAt ? "Deleted" : city.isActive ? "Active" : "Inactive"}</span></td>
                <td className="px-5 py-4"><div className="flex justify-end gap-4">{!city.deletedAt && <><Link href={`/admin/cities?edit=${city.id}`} className="text-xs font-bold text-amber-800 hover:text-amber-950">Edit</Link><DeleteCityButton cityId={city.id} cityName={city.name} /></>}</div></td>
              </tr>)}
              {cities.length === 0 && <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-stone-500">No cities match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <RatePagination currentPage={currentPage} totalPages={totalPages} basePath="/admin/cities" searchParams={paginationParams} />
    </div>
  );
}
