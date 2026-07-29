import Image from "next/image";
import Link from "next/link";
import { BIS_CERTIFICATE, CONTACT_EMAIL, FOOTER_DESCRIPTION, FOOTER_LINKS, SOCIAL_LINKS } from "@/lib/footer-config";

function SocialIcon({ label }: { label: string }) {
  if (label === "Facebook") return <path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v2H6v4h3v7h4v-7h3l1-4h-4V9c0-.7.3-1 1-1Z" />;
  if (label === "Instagram") return <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" /></>;
  return <path d="m5 4 14 16M19 4 5 20" />;
}

export function Footer() {
  return (
    <footer className="border-t-2 border-amber-600/60 bg-[#171411] text-stone-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" aria-label="RateStack home" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400">
            <Image src="/ratestack-logo.png" alt="RateStack" width={112} height={56} className="h-14 w-28 rounded-lg bg-white object-cover" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-stone-400">{FOOTER_DESCRIPTION}</p>
          <p className="mt-4 text-sm font-bold text-amber-300">BIS Certificate No: {BIS_CERTIFICATE}</p>
        </div>
        <nav aria-label="Company and purchase policies">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-amber-400">Company</p>
          <ul className="space-y-3">{FOOTER_LINKS.slice(0, 4).map((item) => <li key={item.href}><Link href={item.href} className="text-sm transition-colors hover:text-amber-300 focus-visible:text-amber-300">{item.label}</Link></li>)}</ul>
        </nav>
        <nav aria-label="Privacy and support">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-amber-400">Support</p>
          <ul className="space-y-3">{FOOTER_LINKS.slice(4).map((item) => <li key={item.href}><Link href={item.href} className="text-sm transition-colors hover:text-amber-300 focus-visible:text-amber-300">{item.label}</Link></li>)}</ul>
        </nav>
        <div>
          <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-amber-400">Connect</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm hover:text-amber-300">{CONTACT_EMAIL}</a>
          {SOCIAL_LINKS.length > 0 && <div className="mt-5 flex gap-3">{SOCIAL_LINKS.map((item) => <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`RateStack on ${item.label}`} className="grid h-10 w-10 place-items-center rounded-full border border-stone-700 transition hover:border-amber-400 hover:text-amber-300"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="2"><SocialIcon label={item.label} /></svg></a>)}</div>}
        </div>
      </div>
      <div className="border-t border-stone-800"><p className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-stone-500 sm:px-6 lg:px-8">© {new Date().getFullYear()} RateStack. All rights reserved.</p></div>
    </footer>
  );
}
