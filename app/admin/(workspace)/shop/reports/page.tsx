import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { paise } from "@/lib/admin-shop";
export const metadata: Metadata = { title: "Shop Reports" };
export const dynamic = "force-dynamic";
export default async function Page() {
  const orders = await prisma.shopOrder.findMany();
  const paid = orders.filter((order) => order.paymentStatus === "SUCCESS");
  const money = (field: "totalAmountPaise" | "gstPaise") => paise(paid.reduce((sum, order) => sum + order[field], 0n));
  const summaries = [
    ["Sales report", `${paid.length} successful orders · ${money("totalAmountPaise")}`],
    ["Product-wise sales", [...new Set(paid.map((o) => o.productName))].map((name) => `${name}: ${paid.filter((o) => o.productName === name).length}`).join(" · ") || "No sales"],
    ["Gold vs Silver sales", `Gold: ${paid.filter((o) => o.metalType === "GOLD").length} · Silver: ${paid.filter((o) => o.metalType === "SILVER").length}`],
    ["Payment gateway report", [...new Set(orders.map((o) => o.gateway))].map((name) => `${name}: ${orders.filter((o) => o.gateway === name).length}`).join(" · ") || "No payments"],
    ["GST report", money("gstPaise")],
    ["Order status report", [...new Set(orders.map((o) => o.orderStatus))].map((name) => `${name}: ${orders.filter((o) => o.orderStatus === name).length}`).join(" · ") || "No orders"],
    ["Customer report", `${new Set(orders.map((o) => o.userId)).size} Shop customers`],
    ["Invoice export", `${orders.filter((o) => o.invoiceNumber).length} invoices available`],
  ];
  return <div><h1 className="font-display text-4xl font-bold">Shop Reports</h1><p className="mt-2 text-stone-600">Direct Shop performance only; legacy scheme financial records are excluded.</p><div className="mt-7 grid gap-4 md:grid-cols-2">{summaries.map(([label, value]) => <article key={label} className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-bold">{label}</h2><p className="mt-3 text-sm text-stone-600">{value}</p></article>)}</div></div>;
}
