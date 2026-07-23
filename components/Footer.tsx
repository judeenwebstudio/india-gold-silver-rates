import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-stone-800 bg-[#171411] py-8 text-stone-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/ratestack-logo.png"
            alt=""
            width={64}
            height={32}
            className="h-8 w-16 rounded-md bg-white object-cover"
          />
          <div><p className="font-display text-lg font-bold text-white">RateStack</p><p className="mt-1 text-xs">India gold &amp; silver rates</p></div>
        </div>
        <p className="max-w-2xl text-xs leading-5 md:text-right">Indicative city rates combine the latest national source rate with a configured local adjustment. Final jeweller prices, making charges, and taxes may vary.</p>
      </div>
    </footer>
  );
}
