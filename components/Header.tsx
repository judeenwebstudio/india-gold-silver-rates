"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AuthModal } from "@/components/AuthModal";

const navigation = [
  { label: "Today’s rates", href: "/#rates" },
  { label: "Shop", href: "/shop" },
  { label: "Cities", href: "/#cities" },
  { label: "Calculator", href: "/#calculator" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [userToken, setUserToken] = useState<string | null>(() => typeof window === "undefined" ? null : localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token"));
  const [userName, setUserName] = useState<string>(() => typeof window === "undefined" ? "Customer" : localStorage.getItem("scheme_user_name") || "Customer");

  useEffect(() => {
    const handleAuthChange = () => {
      const updatedToken = localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
      setUserToken(updatedToken);
      const name = localStorage.getItem("scheme_user_name");
      if (name) setUserName(name);
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
    localStorage.removeItem("scheme_user_name");
    localStorage.removeItem("scheme_user_phone");
    setUserToken(null);
    setAccountDropdownOpen(false);
    window.dispatchEvent(new CustomEvent("auth:change"));
    window.location.href = "/";
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-[#fbfaf7]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-w-0 h-18 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 md:flex-none md:gap-3" aria-label="RateStack home">
            <Image
              src="/ratestack-logo.png"
              alt=""
              width={80}
              height={40}
              priority
              className="h-8 w-16 shrink-0 rounded-lg border border-stone-200 bg-white object-cover shadow-sm md:h-10 md:w-20"
            />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-base font-bold tracking-tight text-stone-900 md:text-lg">RateStack</span>
              <span className="block truncate text-[0.52rem] font-bold uppercase tracking-[0.15em] text-amber-700 md:text-[0.62rem] md:tracking-[0.2em]">Gold &amp; silver</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} className="text-xs font-bold text-stone-700 transition-colors hover:text-amber-800">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {userToken ? (
              <div className="relative flex items-center gap-3">
                <span className="hidden md:inline-block text-xs font-bold text-stone-700">
                  Welcome, <span className="text-amber-800 font-extrabold">{userName}</span>
                </span>

                {/* My Account Dropdown Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountDropdownOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-600/30 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-100 shadow-sm"
                  >
                    <span>My Account</span>
                    <span className="text-[0.6rem] text-amber-800">▼</span>
                  </button>

                  {accountDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-stone-200 shadow-xl py-2 z-50 text-xs font-semibold text-stone-800 space-y-1">
                      <Link
                        href="/shop/orders"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-amber-50 hover:text-amber-900 transition-colors"
                      >
                        📊 My Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setAccountDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-amber-50 hover:text-amber-900 transition-colors"
                      >
                        👤 My Profile
                      </Link>
                      <div className="border-t border-stone-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors font-bold"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  )}
                </div>
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
                  className="hidden rounded-xl bg-amber-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-800 shadow-sm md:inline-flex"
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
              {userToken && (
                <div className="pb-2 border-b border-stone-200 text-xs font-bold text-stone-800">
                  Welcome, <span className="text-amber-800">{userName}</span>
                </div>
              )}
              {navigation.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-amber-50">
                  {item.label}
                </a>
              ))}
              {userToken ? (
                <div className="pt-2 border-t border-stone-200 grid gap-1">
                  <Link
                    href="/shop/orders"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-50"
                  >
                    📊 My Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-bold text-amber-900 hover:bg-amber-50"
                  >
                    👤 My Profile
                  </Link>
                  <button
                    onClick={() => { setOpen(false); handleLogout(); }}
                    className="text-left rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    🚪 Logout
                  </button>
                </div>
              ) : (
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
          }}
        />
      )}
    </>
  );
}
