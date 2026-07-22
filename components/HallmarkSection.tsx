const hallmarkPoints = [
  { mark: "BIS", title: "BIS Standard Mark", detail: "Confirms the jewellery has been assessed by a BIS-recognised centre." },
  { mark: "22K", title: "Purity mark", detail: "Look for the fineness grade, such as 22K916, 18K750, or 14K585." },
  { mark: "HUID", title: "6-digit HUID", detail: "A unique code that helps identify and verify each hallmarked item." },
];

export function HallmarkSection() {
  return (
    <section id="hallmark" className="bg-[#211d18] py-14 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-300">Buy with confidence</p>
            <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">Know your gold hallmark</h2>
            <p className="mt-4 text-sm leading-7 text-stone-400">A dedicated hallmark guide and verification resources will be added in the next content stage.</p>
            <div className="mt-6 inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-bold text-amber-200">Hallmark guide preview</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {hallmarkPoints.map((item) => (
              <article key={item.mark} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-amber-300/30 bg-amber-300/10 text-xs font-extrabold text-amber-300">{item.mark}</span>
                <h3 className="mt-5 font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-400">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
