"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthModal } from "@/components/AuthModal";
import { DEFAULT_CUSTOMER_RETURN_TO, safeCustomerReturnTo } from "@/lib/customer-auth-return";

function subscribeAuth(callback: () => void) {
  window.addEventListener("auth:change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("auth:change", callback);
    window.removeEventListener("storage", callback);
  };
}

function getAuthSnapshot() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("scheme_user_token") || localStorage.getItem("ratestack_user_token");
}

function getServerSnapshot() {
  return null;
}

function emptySubscribe() {
  return () => {};
}

export function MobileBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const userToken = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getServerSnapshot
  );

  if (!mounted) return null;

  // Route exclusions
  if (
    pathname.startsWith("/admin") ||
    pathname.includes("/pdf") ||
    pathname.includes("/invoice") ||
    pathname.endsWith(".pdf")
  ) {
    return null;
  }

  // Active route matching
  const isHomeActive = pathname === "/";

  const isShopActive =
    (pathname.startsWith("/shop") && !pathname.startsWith("/shop/orders")) ||
    pathname.startsWith("/product") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/order-review");

  const isDashboardActive =
    pathname.startsWith("/schemes/dashboard") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/shop/orders") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/wishlist") ||
    pathname.startsWith("/addresses") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/schemes/redemption") ||
    pathname.startsWith("/schemes/join");

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (userToken) {
      router.push(DEFAULT_CUSTOMER_RETURN_TO);
    } else {
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-500/20 bg-[#171411]/95 text-stone-300 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.5)] md:hidden"
        style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="grid h-16 grid-cols-3">
          {/* 1. Home */}
          <Link
            href="/"
            aria-label="Home"
            aria-current={isHomeActive ? "page" : undefined}
            className={`relative flex min-h-[44px] flex-col items-center justify-center pt-2 pb-1 text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
              isHomeActive ? "text-amber-400 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {isHomeActive && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-400" aria-hidden="true" />
            )}
            <svg
              className="h-6 w-6 mb-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={isHomeActive ? 2.2 : 1.8}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125h4.875v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.875c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5"
              />
            </svg>
            <span>Home</span>
          </Link>

          {/* 2. Shop */}
          <Link
            href="/shop"
            aria-label="Shop"
            aria-current={isShopActive ? "page" : undefined}
            className={`relative flex min-h-[44px] flex-col items-center justify-center pt-2 pb-1 text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
              isShopActive ? "text-amber-400 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {isShopActive && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-400" aria-hidden="true" />
            )}
            <svg
              className="h-6 w-6 mb-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={isShopActive ? 2.2 : 1.8}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.25 10.5a.75.75 0 100-1.5.75.75 0 000 1.5zm7.5 0a.75.75 0 100-1.5.75.75 0 000 1.5z"
              />
            </svg>
            <span>Shop</span>
          </Link>

          {/* 3. Dashboard */}
          <button
            type="button"
            onClick={handleDashboardClick}
            aria-label="Dashboard"
            aria-current={isDashboardActive ? "page" : undefined}
            className={`relative flex min-h-[44px] flex-col items-center justify-center pt-2 pb-1 text-[11px] font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
              isDashboardActive ? "text-amber-400 font-bold" : "text-stone-400 hover:text-stone-200"
            }`}
          >
            {isDashboardActive && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-400" aria-hidden="true" />
            )}
            <svg
              className="h-6 w-6 mb-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={isDashboardActive ? 2.2 : 1.8}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Dashboard</span>
          </button>
        </div>
      </nav>

      {/* Auth Modal for unauthenticated Dashboard access */}
      {showAuthModal && (
        <AuthModal
          initialMode="login"
          redirectTo={safeCustomerReturnTo(DEFAULT_CUSTOMER_RETURN_TO)}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            window.dispatchEvent(new CustomEvent("auth:change"));
          }}
        />
      )}
    </>
  );
}
