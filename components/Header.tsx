"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthModal } from "@/components/AuthModal";

const navigation = [
  { label: "Today’s rates", href: "/#rates" },
  { label: "Shop", href: "/shop" },
  { label: "Calculator", href: "/#calculator" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState("");
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

  useEffect(() => {
    const updateHeaderState = () => {
      setScrolled(window.scrollY > 24);
      setActiveHash(window.location.hash);
    };
    updateHeaderState();
    window.addEventListener("scroll", updateHeaderState, { passive: true });
    window.addEventListener("hashchange", updateHeaderState);
    return () => {
      window.removeEventListener("scroll", updateHeaderState);
      window.removeEventListener("hashchange", updateHeaderState);
    };
  }, []);

  const isActive = (href: string) => {
    if (href === "/shop") return pathname.startsWith("/shop");
    if (pathname !== "/") return false;
    const hash = href.split("#")[1];
    return activeHash === `#${hash}` || (!activeHash && hash === "rates");
  };

  const foreground = scrolled ? "text-stone-800" : "text-[#fffaf0]";
  const mutedForeground = scrolled ? "text-stone-700" : "text-stone-200";

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
      <header data-scrolled={scrolled} className={`sticky top-0 z-50 border-b border-amber-500/70 backdrop-blur-xl transition-[background-color,box-shadow,color] duration-300 motion-reduce:transition-none ${scrolled ? "bg-[#FAF7F2]/96 text-stone-900 shadow-[0_8px_28px_rgba(41,31,20,0.12)]" : "bg-[#171411]/92 text-[#fffaf0]"}`}>
        <div className="mx-auto flex min-w-0 h-18 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 md:flex-none md:gap-3" aria-label="RateStack home">
            <Image
              src="/ratestack-logo.png"
              alt=""
              width={80}
              height={40}
              priority
              className={`h-8 w-16 shrink-0 rounded-lg border bg-white object-cover shadow-sm transition-colors duration-300 md:h-10 md:w-20 motion-reduce:transition-none ${scrolled ? "border-stone-200" : "border-amber-400/50"}`}
            />
            <span className="min-w-0 leading-tight">
              <span className={`block truncate font-display text-base font-bold tracking-tight transition-colors duration-300 md:text-lg motion-reduce:transition-none ${foreground}`}>RateStack</span>
              <span className={`block truncate text-[0.52rem] font-bold uppercase tracking-[0.15em] transition-colors duration-300 md:text-[0.62rem] md:tracking-[0.2em] motion-reduce:transition-none ${scrolled ? "text-amber-700" : "text-amber-300"}`}>Gold &amp; silver</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`group relative py-2 text-xs font-bold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 ${isActive(item.href) ? (scrolled ? "text-amber-800" : "text-amber-300") : mutedForeground} hover:text-amber-500`}>
                {item.label}
                <span aria-hidden="true" className={`absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-amber-500 transition-transform duration-200 motion-reduce:transition-none ${isActive(item.href) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`} />
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {userToken ? (
              <div className="relative flex items-center gap-3">
                <span className={`hidden text-xs font-bold md:inline-block ${mutedForeground}`}>
                  Welcome, <span className="text-amber-800 font-extrabold">{userName}</span>
                </span>

                {/* My Account Dropdown Trigger */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountDropdownOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 rounded-xl border border-amber-500/70 px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${scrolled ? "bg-white/70 text-stone-900 hover:bg-amber-50" : "bg-black/20 text-white hover:bg-amber-400/10"}`}
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
                  className={`rounded-xl border border-amber-500/80 px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${scrolled ? "bg-white/70 text-stone-900 hover:bg-amber-50" : "bg-black/20 text-white hover:bg-amber-400/10"}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAuth("register")}
                  className="hidden rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 px-3.5 py-1.5 text-xs font-black text-stone-950 shadow-[0_6px_18px_rgba(217,151,34,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_9px_22px_rgba(217,151,34,0.38)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 motion-reduce:transform-none motion-reduce:transition-none md:inline-flex"
                >
                  Register
                </button>
              </div>
            )}

            <button
              type="button"
              className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 motion-reduce:transition-none lg:hidden ${scrolled ? "border-stone-300 bg-white/80" : "border-amber-400/60 bg-black/20"}`}
              aria-label={open ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="space-y-1.5" aria-hidden="true">
                <span className={`block h-0.5 w-5 transition-transform motion-reduce:transition-none ${scrolled ? "bg-stone-800" : "bg-white"} ${open ? "translate-y-2 rotate-45" : ""}`} />
                <span className={`block h-0.5 w-5 transition-opacity motion-reduce:transition-none ${scrolled ? "bg-stone-800" : "bg-white"} ${open ? "opacity-0" : ""}`} />
                <span className={`block h-0.5 w-5 transition-transform motion-reduce:transition-none ${scrolled ? "bg-stone-800" : "bg-white"} ${open ? "-translate-y-2 -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
        </div>

        {open && (
          <nav className={`border-t border-amber-500/40 px-4 py-4 shadow-xl transition-colors duration-300 motion-reduce:transition-none lg:hidden ${scrolled ? "bg-[#FAF7F2] text-stone-900" : "bg-[#171411]/98 text-white"}`} aria-label="Mobile navigation">
            <div className="mx-auto grid max-w-7xl gap-2">
              {userToken && (
                <div className={`border-b pb-2 text-xs font-bold ${scrolled ? "border-stone-200 text-stone-800" : "border-white/15 text-stone-100"}`}>
                  Welcome, <span className="text-amber-800">{userName}</span>
                </div>
              )}
              {navigation.map((item) => (
                <a key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setOpen(false)} className={`rounded-lg border-l-2 px-3 py-2.5 text-sm font-semibold transition-colors ${isActive(item.href) ? "border-amber-500 text-amber-500" : "border-transparent"} ${scrolled ? "hover:bg-amber-50" : "hover:bg-white/10"}`}>
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
                  <button
                    onClick={() => { setOpen(false); handleLogout(); }}
                    className="text-left rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    🚪 Logout
                  </button>
                </div>
              ) : (
                <div className={`grid grid-cols-2 gap-2 border-t pt-2 ${scrolled ? "border-stone-200" : "border-white/15"}`}>
                  <button
                    onClick={() => { setOpen(false); handleOpenAuth("login"); }}
                    className={`rounded-lg border border-amber-500/70 py-2.5 text-center text-xs font-bold ${scrolled ? "text-stone-800" : "text-white"}`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setOpen(false); handleOpenAuth("register"); }}
                    className="rounded-lg bg-gradient-to-br from-amber-300 via-amber-400 to-amber-600 py-2.5 text-center text-xs font-black text-stone-950"
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
