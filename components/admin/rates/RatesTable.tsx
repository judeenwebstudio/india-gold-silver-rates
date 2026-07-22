import Link from "next/link";

import { DeleteRateButton } from "@/components/admin/rates/DeleteRateButton";
import {
  formatCurrency,
  METAL_MANAGEMENT,
  PURITY_LABELS,
  type ManagedMetalType,
  type ManagedPurity,
} from "@/lib/rate-management";

export type RateTableRow = {
  id: string;
  metalType: ManagedMetalType;
  purity: ManagedPurity;
  pricePerGram: string;
  pricePerKilogram: string | null;
  cityName: string;
  stateName: string;
  source: string;
  recordedAt: string;
  recordedAtLabel: string;
  isActive: boolean;
};

type RatesTableProps = {
  metalType: ManagedMetalType;
  rates: RateTableRow[];
};

export function RatesTable({ metalType, rates }: RatesTableProps) {
  const metal = METAL_MANAGEMENT[metalType];

  if (rates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-stone-100 font-display text-sm font-bold text-stone-600">
          {metal.marker}
        </span>
        <h2 className="mt-4 font-display text-xl font-bold text-stone-900">No matching rates</h2>
        <p className="mt-2 text-sm text-stone-500">Adjust the filters or add a new {metal.label.toLowerCase()} rate.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px] border-collapse text-left">
          <thead className="border-b border-stone-200 bg-stone-50">
            <tr className="text-[0.68rem] font-black uppercase tracking-[0.12em] text-stone-500">
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Location</th>
              <th className="px-5 py-4">Purity</th>
              <th className="px-5 py-4">Per gram</th>
              <th className="px-5 py-4">Per kilogram</th>
              <th className="px-5 py-4">Recorded at</th>
              <th className="px-5 py-4">Source</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rates.map((rate) => (
              <tr key={rate.id} className={rate.isActive ? "text-stone-700" : "bg-stone-50/80 text-stone-400"}>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[0.66rem] font-black uppercase tracking-wider ${rate.isActive ? "bg-emerald-50 text-emerald-800" : "bg-stone-200 text-stone-600"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${rate.isActive ? "bg-emerald-500" : "bg-stone-500"}`} />
                    {rate.isActive ? "Active" : "Deleted"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <p className="font-bold text-stone-900">{rate.cityName}</p>
                  <p className="mt-1 text-xs text-stone-500">{rate.stateName}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900">
                    {PURITY_LABELS[rate.purity]}
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-stone-900">{formatCurrency(rate.pricePerGram)}</td>
                <td className="px-5 py-4 font-semibold">{rate.pricePerKilogram ? formatCurrency(rate.pricePerKilogram) : "—"}</td>
                <td className="px-5 py-4">
                  <time dateTime={rate.recordedAt} className="text-sm font-semibold text-stone-800">
                    {rate.recordedAtLabel}
                  </time>
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[0.68rem] font-bold text-stone-600">{rate.source}</span>
                </td>
                <td className="px-5 py-4">
                  {rate.isActive ? (
                    <div className="flex items-start justify-end gap-4">
                      <Link href={`${metal.route}?edit=${rate.id}`} className="text-xs font-bold text-amber-800 hover:text-amber-950">
                        Edit
                      </Link>
                      <DeleteRateButton
                        rateId={rate.id}
                        rateLabel={`${PURITY_LABELS[rate.purity]} ${metal.label.toLowerCase()} rate for ${rate.cityName}`}
                      />
                    </div>
                  ) : (
                    <p className="text-right text-xs font-semibold text-stone-400">Read only</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
