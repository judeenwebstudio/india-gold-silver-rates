import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Rate Sources" };
export const dynamic = "force-dynamic";

const definitions = [
  { provider: "GOODRETURNS", priority: "1", role: "Primary Trichy retail market rate", enabled: true, compliance: "Public pages; robots and response validation enforced" },
  { provider: "IBJA", priority: "2", role: "National market reference fallback", enabled: true, compliance: "Reference rate; never labelled as a Trichy-published rate" },
  { provider: "BANKBAZAAR", priority: "3", role: "Authorised fallback integration", enabled: false, compliance: "Authorised source access required" },
  { provider: "PREVIOUS_VERIFIED_RATE", priority: "Final", role: "Safe stored-rate fallback", enabled: true, compliance: "Preserves original provider and rate date" },
  { provider: "MCX", priority: "Separate", role: "Exchange benchmark only", enabled: false, compliance: "Licensed data-feed agreement required" },
] as const;

export default async function RateSourcesPage() {
  const logs = await prisma.rateUpdateLog.findMany({
    where: { source: { in: ["GOODRETURNS", "IBJA", "BANKBAZAAR", "MCX"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return <main className="space-y-6">
    <header>
      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Market data controls</p>
      <h1 className="mt-2 text-3xl font-black text-stone-950">Rate Sources</h1>
      <p className="mt-2 text-sm text-stone-600">Retail priority and exchange benchmarks are intentionally kept separate.</p>
    </header>
    <section className="grid gap-4 xl:grid-cols-2">
      {definitions.map((definition) => {
        const providerLogs = logs.filter((log) => log.source === definition.provider);
        const last = providerLogs[0];
        const success = providerLogs.find((log) => log.status === "SUCCESS" || log.status === "NO_CHANGE");
        return <article key={definition.provider} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div><h2 className="font-black text-stone-950">{definition.provider}</h2><p className="text-xs text-stone-500">Priority: {definition.priority}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${definition.enabled ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>{definition.enabled ? "Enabled" : "Disabled"}</span>
          </div>
          <p className="mt-4 text-sm font-semibold text-stone-800">{definition.role}</p>
          <p className="mt-1 text-xs text-stone-500">{definition.compliance}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-stone-500">Last attempt</dt><dd className="font-bold">{last?.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) ?? "Never"}</dd></div>
            <div><dt className="text-stone-500">Last success</dt><dd className="font-bold">{success?.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) ?? "Never"}</dd></div>
          </dl>
        </article>;
      })}
    </section>
  </main>;
}
