"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthModal } from "@/components/AuthModal";

const navigation = [
  { label: "Today’s rates", href: "/#rates" },
  { label: "My Schemes", href: "/#my-schemes" },
  { label: "Coin Savings Scheme", href: "/schemes" },
  { label: "Historical", href: "/#historical" },
  { label: "Cities", href: "/#cities" },
  { label: "Calculator", href: "/#calculator" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
    setUserToken(token);

    const handleAuthChange = () => {
      const updatedToken = localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
      setUserToken(updatedToken);
    };

    window.addEventListener("auth:change", handleAuthChange);
    return () => window.removeEventListener("auth:change", handleAuthChange);
  }, []);

  const handleOpenAuth = (mode: "login" | "register") => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("scheme_user_token");
    localStorage.removeItem("ratestack_user_token");
    setUserToken(null);
    window.dispatchEvent(new CustomEvent("auth:change"));
    window.location.reload();
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#fbfaf7]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="RateStack home">
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
              <span className="block text-[0.62rem] font-bold uppercase tracking-[0.2em] text-amber-700">Gold &amp; silver</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} className="text-xs font-bold text-stone-700 transition-colors hover:text-amber-800">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {userToken ? (
              <div className="flex items-center gap-3">
                <a
                  href="/#my-schemes"
                  className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-950 font-bold text-xs border border-amber-300/60"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-600" />
                  My Dashboard
                </a>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-100"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAuth("login")}
                  className="rounded-xl border border-amber-500/30 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-50 shadow-sm"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAuth("register")}
                  className="rounded-xl bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-800 shadow-sm"
                >
                  Register
                </button>
              </div>
            )}

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
        </div>

        {open && (
          <nav className="border-t border-stone-200 bg-[#fbfaf7] px-4 py-4 lg:hidden" aria-label="Mobile navigation">
            <div className="mx-auto grid max-w-7xl gap-2">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-amber-50">
                  {item.label}
                </a>
              ))}
              {!userToken && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200">
                  <button
                    onClick={() => { setOpen(false); handleOpenAuth("login"); }}
                    className="py-2.5 rounded-lg border border-stone-300 text-center font-bold text-xs text-stone-800"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setOpen(false); handleOpenAuth("register"); }}
                    className="py-2.5 rounded-lg bg-amber-700 text-center font-bold text-xs text-white"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Shared Auth Modal */}
      {showAuthModal && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setUserToken(localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token"));
            window.dispatchEvent(new CustomEvent("auth:change"));
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
