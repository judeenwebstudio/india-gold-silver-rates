import Link from "next/link";

import { RateFilters } from "@/components/admin/rates/RateFilters";
import { RateForm } from "@/components/admin/rates/RateForm";
import { RateNotification } from "@/components/admin/rates/RateNotification";
import { RatePagination } from "@/components/admin/rates/RatePagination";
import { RatesTable, type RateTableRow } from "@/components/admin/rates/RatesTable";
import { MetalPurity, MetalType, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  formatDateTimeInput,
  isManagedPurity,
  isPurityAllowedForMetal,
  METAL_MANAGEMENT,
  PURITY_LABELS,
  type EditableRate,
  type ManagedMetalType,
  type ManagedPurity,
  type RateLocationOption,
} from "@/lib/rate-management";

const PAGE_SIZE = 20;

export type RateSearchParams = Record<string, string | string[] | undefined>;

type RateManagementPageProps = {
  metalType: ManagedMetalType;
  searchParams: RateSearchParams;
};

function getParam(searchParams: RateSearchParams, name: string) {
  const value = searchParams[name];
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearchPurity(value: string): ManagedPurity | null {
  const normalized = value.toUpperCase().replace(/\s+/g, "");
  const mapping: Record<string, ManagedPurity> = {
    "24K": "K24",
    K24: "K24",
    "22K": "K22",
    K22: "K22",
    "18K": "K18",
    K18: "K18",
    "14K": "K14",
    K14: "K14",
    "999": "P999",
    P999: "P999",
    "925": "P925",
    P925: "P925",
  };

  return mapping[normalized] ?? null;
}

function formatRecordedAt(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export async function RateManagementPage({
  metalType,
  searchParams,
}: RateManagementPageProps) {
  const metal = METAL_MANAGEMENT[metalType];
  const prismaMetal = metalType === "GOLD" ? MetalType.GOLD : MetalType.SILVER;
  const query = getParam(searchParams, "q").slice(0, 100);
  const stateId = getParam(searchParams, "state");
  const cityId = getParam(searchParams, "city");
  const purityValue = getParam(searchParams, "purity");
  const requestedPage = Math.max(1, Number.parseInt(getParam(searchParams, "page"), 10) || 1);
  const editId = getParam(searchParams, "edit");
  const showAddForm = getParam(searchParams, "mode") === "add";
  const notice = getParam(searchParams, "notice");
  const filters: Prisma.MetalRateWhereInput[] = [{ metalType: prismaMetal }];

  if (stateId) {
    filters.push({ city: { stateId } });
  }

  if (cityId) {
    filters.push({ cityId });
  }

  if (isManagedPurity(purityValue) && isPurityAllowedForMetal(metalType, purityValue)) {
    filters.push({ purity: purityValue as MetalPurity });
  }

  if (query) {
    const searchedPurity = normalizeSearchPurity(query);
    const searchFilters: Prisma.MetalRateWhereInput[] = [
      { source: { contains: query, mode: "insensitive" } },
      { city: { name: { contains: query, mode: "insensitive" } } },
      { city: { state: { name: { contains: query, mode: "insensitive" } } } },
    ];

    if (searchedPurity && isPurityAllowedForMetal(metalType, searchedPurity)) {
      searchFilters.push({ purity: searchedPurity as MetalPurity });
    }

    filters.push({ OR: searchFilters });
  }

  const where: Prisma.MetalRateWhereInput = { AND: filters };
  const [locationRecords, totalRecords, activeRecords, deletedRecords] = await Promise.all([
    prisma.state.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        cities: {
          where: { isActive: true, deletedAt: null },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        },
      },
    }),
    prisma.metalRate.count({ where }),
    prisma.metalRate.count({ where: { metalType: prismaMetal, isActive: true } }),
    prisma.metalRate.count({ where: { metalType: prismaMetal, isActive: false } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const [rateRecords, editingRecord] = await Promise.all([
    prisma.metalRate.findMany({
      where,
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        city: {
          include: { state: true },
        },
      },
    }),
    editId
      ? prisma.metalRate.findFirst({
          where: { id: editId, metalType: prismaMetal, isActive: true },
          include: { city: true },
        })
      : Promise.resolve(null),
  ]);

  const locations: RateLocationOption[] = locationRecords;
  const fallbackState = locations[0];
  const editableRate: EditableRate | undefined = editingRecord && isManagedPurity(editingRecord.purity)
    ? {
        id: editingRecord.id,
        stateId: editingRecord.city?.stateId ?? fallbackState?.id ?? "",
        cityId: editingRecord.cityId ?? fallbackState?.cities[0]?.id ?? "",
        purity: editingRecord.purity,
        pricePerGram: editingRecord.pricePerGram.toString(),
        pricePerKilogram: editingRecord.pricePerKilogram?.toString() ?? "",
        recordedAt: formatDateTimeInput(editingRecord.recordedAt),
      }
    : undefined;
  const rates: RateTableRow[] = rateRecords.map((rate) => ({
    id: rate.id,
    metalType,
    purity: rate.purity as ManagedPurity,
    pricePerGram: rate.pricePerGram.toString(),
    pricePerKilogram: rate.pricePerKilogram?.toString() ?? null,
    cityName: rate.city?.name ?? "National rate",
    stateName: rate.city?.state.name ?? "All India",
    source: rate.source,
    recordedAt: rate.recordedAt.toISOString(),
    recordedAtLabel: formatRecordedAt(rate.recordedAt),
    isActive: rate.isActive,
  }));
  const paginationParams = Object.fromEntries(
    Object.entries({ q: query, state: stateId, city: cityId, purity: purityValue }).filter(([, value]) => value),
  );
  const otherMetal = metalType === "GOLD" ? METAL_MANAGEMENT.SILVER : METAL_MANAGEMENT.GOLD;

  return (
    <div className="mx-auto max-w-[96rem]">
      <RateNotification notice={notice} />

      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            <span className={`h-2 w-2 rounded-full ${metalType === "GOLD" ? "bg-amber-500" : "bg-slate-400"}`} />
            Manual rate management
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950 sm:text-5xl">
            {metal.label} Rates
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
            Search, filter, create, edit, and safely retire {metal.label.toLowerCase()} rate records. Every change is audited.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={otherMetal.route} className="inline-flex min-h-11 items-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-bold text-stone-700 shadow-sm hover:border-amber-500">
            View {otherMetal.label} Rates
          </Link>
          <Link href={`${metal.route}?mode=add`} className="inline-flex min-h-11 items-center rounded-xl bg-stone-950 px-5 text-sm font-black text-white shadow-sm hover:bg-amber-800">
            Add Rate
          </Link>
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-3" aria-label={`${metal.label} rate totals`}>
        {[
          ["All records", activeRecords + deletedRecords, "Includes soft-deleted records"],
          ["Active", activeRecords, "Available for normal use"],
          ["Soft deleted", deletedRecords, "Retained for audit purposes"],
        ].map(([label, value, description]) => (
          <article key={String(label)} className="rounded-2xl border border-stone-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] text-stone-500">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold text-stone-950">{Number(value).toLocaleString("en-IN")}</p>
            <p className="mt-1 text-xs text-stone-500">{description}</p>
          </article>
        ))}
      </section>

      {(showAddForm || editId) && (
        <div className="mt-7">
          {editId && !editableRate ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800" role="alert">
              That active {metal.label.toLowerCase()} rate could not be found.
            </div>
          ) : (
            <RateForm
              metalType={metalType}
              locations={locations}
              defaultRecordedAt={formatDateTimeInput(new Date())}
              initialRate={editableRate}
            />
          )}
        </div>
      )}

      <div className="mt-7">
        <RateFilters
          metalType={metalType}
          locations={locations}
          values={{ query, stateId, cityId, purity: purityValue }}
        />
      </div>

      <section className="mt-7" aria-labelledby={`${metalType.toLowerCase()}-records-title`}>
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 id={`${metalType.toLowerCase()}-records-title`} className="text-sm font-black uppercase tracking-[0.14em] text-stone-700">
              Rate records
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              {totalRecords.toLocaleString("en-IN")} matching {totalRecords === 1 ? "record" : "records"}
            </p>
          </div>
          <p className="text-xs font-semibold text-stone-400">
            Purities: {metal.purities.map((purity) => PURITY_LABELS[purity]).join(", ")}
          </p>
        </div>
        <RatesTable metalType={metalType} rates={rates} />
        <RatePagination
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={metal.route}
          searchParams={paginationParams}
        />
      </section>
    </div>
  );
}
