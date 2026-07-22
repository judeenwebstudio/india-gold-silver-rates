"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationItems = [
  { label: "Dashboard", href: "/admin/dashboard", marker: "OV", available: true },
  { label: "Gold Rates", href: "/admin/gold-rates", marker: "AU", available: true },
  { label: "Silver Rates", href: "/admin/silver-rates", marker: "AG", available: true },
  { label: "States", href: "/admin/states", marker: "ST", available: true },
  { label: "Cities", href: "/admin/cities", marker: "CT", available: true },
  { label: "Rate History", href: "/admin/rate-history", marker: "HI", available: false },
  { label: "API Logs", href: "/admin/api-logs", marker: "LG", available: true },
  { label: "Settings", href: "/admin/settings", marker: "SE", available: false },
] as const;

type AdminNavigationProps = {
  variant?: "dark" | "light";
};

export function AdminNavigation({ variant = "dark" }: AdminNavigationProps) {
  const pathname = usePathname();
  const isDark = variant === "dark";

  return (
    <nav aria-label="Admin navigation">
      <ul className="space-y-1.5">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href;
          const itemClassName = [
            "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
            isActive
              ? isDark
                ? "bg-amber-400 text-stone-950 shadow-lg shadow-amber-950/20"
                : "bg-amber-100 text-amber-950"
              : isDark
                ? "text-stone-300 hover:bg-white/7 hover:text-white"
                : "text-stone-700 hover:bg-stone-100 hover:text-stone-950",
            item.available ? "" : "cursor-not-allowed opacity-55",
          ].join(" ");

          const content = (
            <>
              <span
                aria-hidden="true"
                className={[
                  "grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-[0.58rem] font-black tracking-wider",
                  isActive
                    ? "border-stone-950/10 bg-stone-950/10 text-stone-950"
                    : isDark
                      ? "border-white/10 bg-white/5 text-amber-300"
                      : "border-stone-200 bg-white text-amber-800",
                ].join(" ")}
              >
                {item.marker}
              </span>
              <span className="min-w-0 flex-1">{item.label}</span>
              {!item.available && (
                <span className="text-[0.58rem] font-black uppercase tracking-[0.14em]">Soon</span>
              )}
            </>
          );

          return (
            <li key={item.href}>
              {item.available ? (
                <Link className={itemClassName} href={item.href} aria-current={isActive ? "page" : undefined}>
                  {content}
                </Link>
              ) : (
                <span className={itemClassName} aria-disabled="true" title="Available in a future stage">
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
