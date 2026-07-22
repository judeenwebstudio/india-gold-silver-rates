import type { ReactNode } from "react";

type DashboardCardProps = {
  label: string;
  value: ReactNode;
  description: ReactNode;
  marker: string;
  tone?: "gold" | "silver" | "stone" | "green";
};

const toneStyles = {
  gold: "border-amber-200 bg-amber-50 text-amber-900",
  silver: "border-slate-200 bg-slate-100 text-slate-700",
  stone: "border-stone-200 bg-stone-100 text-stone-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
} as const;

export function DashboardCard({
  label,
  value,
  description,
  marker,
  tone = "stone",
}: DashboardCardProps) {
  return (
    <article className="group rounded-2xl border border-stone-200/90 bg-white p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">{label}</p>
        <span
          aria-hidden="true"
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-[0.64rem] font-black tracking-wider ${toneStyles[tone]}`}
        >
          {marker}
        </span>
      </div>
      <div className="mt-7 font-display text-3xl font-bold leading-tight tracking-[-0.03em] text-stone-950">
        {value}
      </div>
      <div className="mt-2 text-xs leading-5 text-stone-500">{description}</div>
    </article>
  );
}
