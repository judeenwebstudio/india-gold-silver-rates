"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  marker: string;
  available: boolean;
};

type NavGroup = {
  title?: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: "Dashboard",
    items: [
      { label: "Shop Dashboard", href: "/admin/dashboard", marker: "OV", available: true },
    ],
  },
  {
    title: "Rates",
    items: [
      { label: "Gold Rates", href: "/admin/gold-rates", marker: "AU", available: true },
      { label: "Silver Rates", href: "/admin/silver-rates", marker: "AG", available: true },
      { label: "Rate Sources", href: "/admin/rate-sources", marker: "RS", available: true },
      { label: "GoodReturns Cities", href: "/admin/goodreturns-cities", marker: "GC", available: true },
      { label: "Rate History", href: "/admin/rate-history", marker: "HI", available: false },
    ],
  },
  {
    title: "Shop Management",
    items: [
      { label: "Products", href: "/admin/products", marker: "PR", available: true },
      { label: "Coupons", href: "/admin/coupons", marker: "CP", available: true },
      { label: "Product Costs", href: "/admin/products/costs", marker: "PC", available: true },
      { label: "Orders", href: "/admin/orders", marker: "OR", available: true },
      { label: "Payments", href: "/admin/payments", marker: "PY", available: true },
      { label: "Invoices", href: "/admin/invoices", marker: "IN", available: true },
      { label: "Customers", href: "/admin/customers", marker: "CU", available: true },
      { label: "Customer Usage", href: "/admin/customers/usage", marker: "US", available: true },
      { label: "Shop Reports", href: "/admin/shop/reports", marker: "RP", available: true },
      { label: "Reports & Analytics", href: "/admin/reports", marker: "RA", available: true },
      { label: "Notifications", href: "/admin/notifications", marker: "NT", available: true },
      { label: "Payment Gateway", href: "/admin/settings/payment-gateway", marker: "PG", available: true },
      { label: "Shiprocket", href: "/admin/settings/shiprocket", marker: "SR", available: true },
    ],
  },
  {
    title: "Locations & Logs",
    items: [
      { label: "States", href: "/admin/states", marker: "ST", available: true },
      { label: "Cities", href: "/admin/cities", marker: "CT", available: true },
      { label: "API Logs", href: "/admin/api-logs", marker: "LG", available: true },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Analytics", href: "/admin/analytics", marker: "AN", available: true },
      { label: "AdSense", href: "/admin/adsense", marker: "AD", available: true },
      { label: "Admin Settings", href: "/admin/settings", marker: "SE", available: false },
    ],
  },
];

type AdminNavigationProps = {
  variant?: "dark" | "light";
};

export function AdminNavigation({ variant = "dark" }: AdminNavigationProps) {
  const pathname = usePathname();
  const isDark = variant === "dark";

  return (
    <nav aria-label="Admin navigation" className="space-y-6">
      {navGroups.map((group, groupIdx) => (
        <div key={group.title || groupIdx}>
          {group.title && (
            <p
              className={[
                "mb-2.5 px-3 text-[0.62rem] font-black uppercase tracking-[0.2em]",
                isDark ? "text-stone-400" : "text-stone-500",
              ].join(" ")}
            >
              {group.title}
            </p>
          )}

          <ul className="space-y-1.5">
            {group.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname?.startsWith(item.href));
              const itemClassName = [
                "flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                isActive
                  ? isDark
                    ? "bg-amber-400 text-stone-950 shadow-md shadow-amber-950/20"
                    : "bg-amber-100 text-amber-950 font-bold"
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
                      "grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-[0.55rem] font-black tracking-wider",
                      isActive
                        ? "border-stone-950/10 bg-stone-950/10 text-stone-950"
                        : isDark
                          ? "border-white/10 bg-white/5 text-amber-300"
                          : "border-stone-200 bg-white text-amber-800",
                    ].join(" ")}
                  >
                    {item.marker}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {!item.available && (
                    <span className="text-[0.55rem] font-black uppercase tracking-[0.14em]">Soon</span>
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
        </div>
      ))}
    </nav>
  );
}
