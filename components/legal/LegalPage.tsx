import Image from "next/image";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export function LegalPage({ title, intro, children, showLogo = false }: {
  title: string; intro: string; children: React.ReactNode; showLogo?: boolean;
}) {
  return <div className="min-h-screen bg-[#fbfaf7]"><Header /><main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
    <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-10">
      {showLogo && <Image src="/ratestack-logo.png" alt="RateStack" width={176} height={88} className="mb-8 h-22 w-44 rounded-xl border bg-white object-cover" />}
      <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">RateStack</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-stone-950 sm:text-5xl">{title}</h1>
      <p className="mt-5 text-base leading-7 text-stone-600">{intro}</p>
      <div className="mt-9 space-y-8 text-sm leading-7 text-stone-700 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-stone-950 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">{children}</div>
    </article>
  </main><Footer /></div>;
}
