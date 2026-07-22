import { newsItems } from "@/lib/sample-data";

export function NewsSection() {
  return (
    <section id="news" className="bg-[#fbfaf7] py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div><p className="eyebrow">Gold desk</p><h2 className="section-title mt-2">News &amp; buying guides</h2><p className="mt-3 text-sm text-stone-500">Editorial stories will be connected in a later stage.</p></div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {newsItems.map((item, index) => (
            <article key={item.title} className="group flex min-h-64 flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between"><span className="text-xs font-extrabold uppercase tracking-wider text-amber-700">{item.tag}</span><span className="font-display text-2xl text-stone-300">0{index + 1}</span></div>
              <h3 className="mt-8 font-display text-2xl leading-tight tracking-tight text-stone-900">{item.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{item.summary}</p>
              <p className="mt-5 border-t border-stone-100 pt-4 text-xs font-semibold text-stone-400">{item.readTime} · Coming soon</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
