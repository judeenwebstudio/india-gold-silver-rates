import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  description: "Secure administrator login for RateStack.",
  robots: { index: false, follow: false },
};

function getSafeCallbackUrl(value: string | string[] | undefined) {
  const callbackUrl = Array.isArray(value) ? value[0] : value;

  if (callbackUrl?.startsWith("/admin/") && !callbackUrl.startsWith("//")) {
    return callbackUrl;
  }

  return "/admin/dashboard";
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const callbackUrl = getSafeCallbackUrl(params.callbackUrl);

  if (session?.user) {
    redirect(callbackUrl);
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] lg:grid lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden bg-[#171411] px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-28 -top-24 h-96 w-96 rounded-full border border-amber-300/10" />
        <div className="pointer-events-none absolute -right-8 top-10 h-64 w-64 rounded-full border border-amber-300/15" />

        <Link href="/" className="relative flex items-center gap-3" aria-label="Return to public homepage">
          <Image
            src="/ratestack-logo.png"
            alt=""
            width={80}
            height={48}
            priority
            className="h-12 w-20 rounded-lg border border-white/15 bg-white object-cover"
          />
          <span className="leading-tight">
            <span className="block font-display text-xl font-bold">RateStack</span>
            <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-[0.24em] text-amber-300">
              Administration
            </span>
          </span>
        </Link>

        <div className="relative max-w-xl pb-12">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Secure operations workspace</p>
          <h1 className="mt-5 font-display text-5xl leading-[1.08] tracking-[-0.04em]">
            Keep India&apos;s metal-rate data clear and dependable.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-stone-400">
            Sign in to manage rates, locations, update history, and system health.
          </p>
        </div>

        <p className="relative text-xs text-stone-500">Protected administrator access</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-3 lg:hidden" aria-label="Return to public homepage">
            <Image
              src="/ratestack-logo.png"
              alt=""
              width={72}
              height={40}
              priority
              className="h-10 w-18 rounded-lg border border-stone-200 bg-white object-cover"
            />
            <span className="font-display text-lg font-bold text-stone-950">RateStack Admin</span>
          </Link>

          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Admin access</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950">Welcome back</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Enter your administrator credentials to continue.
          </p>

          <LoginForm callbackUrl={callbackUrl} />

          <p className="mt-8 border-t border-stone-200 pt-6 text-center text-xs leading-5 text-stone-500">
            This area is restricted to authorized administrators.
          </p>
        </div>
      </section>
    </main>
  );
}
