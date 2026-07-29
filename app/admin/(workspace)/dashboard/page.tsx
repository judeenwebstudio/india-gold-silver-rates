import type { Metadata } from "next";

import { DashboardCard } from "@/components/admin/DashboardCard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Database overview for the RateStack administration workspace.",
};

export const dynamic = "force-dynamic";

async function getDashboardMetrics() {
  const [totalOrders, successfulOrders, pendingOrders, failedOrders, sales, goldSales, silverSales, customers, pendingShipments] = await Promise.all([
    prisma.shopOrder.count(),
    prisma.shopOrder.count({ where: { paymentStatus: "SUCCESS" } }),
    prisma.shopOrder.count({ where: { paymentStatus: { in: ["CREATED", "PENDING"] } } }),
    prisma.shopOrder.count({ where: { paymentStatus: "FAILED" } }),
    prisma.shopOrder.aggregate({ where: { paymentStatus: "SUCCESS" }, _sum: { totalAmountPaise: true } }),
    prisma.shopOrder.aggregate({ where: { paymentStatus: "SUCCESS", metalType: "GOLD" }, _sum: { totalAmountPaise: true } }),
    prisma.shopOrder.aggregate({ where: { paymentStatus: "SUCCESS", metalType: "SILVER" }, _sum: { totalAmountPaise: true } }),
    prisma.schemeUser.count({ where: { shopOrders: { some: {} } } }),
    prisma.shopOrder.count({ where: { paymentStatus: "SUCCESS", orderStatus: { in: ["CONFIRMED", "PROCESSING"] } } }),
  ]);

  return {
    totalOrders, successfulOrders, pendingOrders, failedOrders, customers, pendingShipments,
    totalSales: Number(sales._sum.totalAmountPaise ?? 0n) / 100,
    goldSales: Number(goldSales._sum.totalAmountPaise ?? 0n) / 100,
    silverSales: Number(silverSales._sum.totalAmountPaise ?? 0n) / 100,
  };
}

export default async function AdminDashboardPage() {
  const metrics = await getDashboardMetrics();

  return (
    <div className="mx-auto max-w-[96rem]">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Live database overview
          </div>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.04em] text-stone-950 sm:text-5xl">
            Shop Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
            Direct coin orders, sales, customers, payments, and fulfilment at a glance.
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs leading-5 text-stone-500 shadow-sm">
          <span className="block font-bold text-stone-800">Secure admin session</span>
          Rate management is available to authenticated administrators.
        </div>
      </div>

      <section className="mt-8" aria-labelledby="database-metrics-title">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id="database-metrics-title" className="text-sm font-black uppercase tracking-[0.14em] text-stone-700">
            Shop metrics
          </h2>
          <span className="text-xs font-semibold text-stone-400">Fetched through Prisma</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DashboardCard
            label="Total Orders" value={metrics.totalOrders.toLocaleString("en-IN")} description="All direct Shop orders" marker="OR"
          />
          <DashboardCard
            label="Successful Orders" value={metrics.successfulOrders.toLocaleString("en-IN")} description="Payment verified" marker="OK" tone="green"
          />
          <DashboardCard
            label="Pending Orders" value={metrics.pendingOrders.toLocaleString("en-IN")} description="Awaiting payment" marker="PD"
          />
          <DashboardCard
            label="Failed Orders" value={metrics.failedOrders.toLocaleString("en-IN")} description="Payment failed" marker="FL"
          />
          <DashboardCard
            label="Total Sales" value={`₹${metrics.totalSales.toLocaleString("en-IN")}`} description="Successful order value" marker="₹" tone="gold"
          />
          <DashboardCard label="Gold Coin Sales" value={`₹${metrics.goldSales.toLocaleString("en-IN")}`} description="Successful Gold 22K orders" marker="AU" tone="gold" />
          <DashboardCard label="Silver Coin Sales" value={`₹${metrics.silverSales.toLocaleString("en-IN")}`} description="Successful silver orders" marker="AG" tone="silver" />
          <DashboardCard label="Total Customers" value={metrics.customers.toLocaleString("en-IN")} description="Customers with Shop orders" marker="CU" />
          <DashboardCard label="Pending Shipments" value={metrics.pendingShipments.toLocaleString("en-IN")} description="Paid orders awaiting dispatch" marker="SH" />
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="Admin stage status">
        <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-stone-500">Data source</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-xs font-black text-emerald-800">DB</span>
            <div>
              <h2 className="font-bold text-stone-950">PostgreSQL connected</h2>
              <p className="mt-1 text-sm text-stone-500">Dashboard values are read directly through the shared Prisma client.</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-stone-500">Access status</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-xs font-black text-amber-800">UI</span>
            <div>
              <h2 className="font-bold text-stone-950">Administrator protected</h2>
              <p className="mt-1 text-sm text-stone-500">Auth.js sessions and route protection secure this workspace.</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
