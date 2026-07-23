"use client";

import { useState } from "react";
import Image from "next/image";

const navigation = [
  { label: "Today’s rates", href: "#rates" },
  { label: "Historical", href: "#historical" },
  { label: "Cities", href: "#cities" },
  { label: "Calculator", href: "#calculator" },
  { label: "Learn", href: "#hallmark" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#fbfaf7]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#" className="flex items-center gap-3" aria-label="RateStack home">
          <Image
            src="/ratestack-logo.png"
            alt=""
            width={80}
            height={40}
            priority
            className="h-10 w-20 rounded-lg border border-stone-200 bg-white object-cover shadow-sm"
          />
          <span className="leading-tight">
            <span className="block font-display text-lg font-bold tracking-tight text-stone-900">RateStack</span>
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.2em] text-amber-700">Gold &amp; silver rates</span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-semibold text-stone-600 transition-colors hover:text-amber-800">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> City rates active
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg border border-stone-200 bg-white lg:hidden"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="space-y-1.5" aria-hidden="true">
            <span className={`block h-0.5 w-5 bg-stone-800 transition-transform ${open ? "translate-y-2 rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-stone-800 transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-stone-800 transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`} />
          </span>
        </button>
      </div>

      {open && (
        <nav className="border-t border-stone-200 bg-[#fbfaf7] px-4 py-4 lg:hidden" aria-label="Mobile navigation">
          <div className="mx-auto grid max-w-7xl gap-1">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-stone-700 hover:bg-amber-50">
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
