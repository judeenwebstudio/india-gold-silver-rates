import { requireCustomerAdmin } from "@/lib/customer-admin";
import { customerUsageRows, usageRow, type UsageFilters } from "@/lib/customer-usage-report";
import { prisma } from "@/lib/prisma";

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"','""')}"`;
export async function GET(request: Request) {
  const admin = await requireCustomerAdmin("CUSTOMER_USAGE_EXPORT");
  const filters = Object.fromEntries(new URL(request.url).searchParams) as UsageFilters;
  const rows = (await customerUsageRows(filters, 10_000)).map(usageRow);
  const body = [["customerName","mobile","email","platform","loginMethods","firstLoginAt","lastLoginAt","lastSeenAt","loginCount","androidAppVersion","accountStatus"],...rows.map(x=>[x.fullName,x.phone,x.email,x.platform,x.methods,x.firstLogin?.toISOString(),x.lastLogin?.toISOString(),x.lastActive?.toISOString(),x.loginCount,x.appVersion,x.isActive&&x.accountStatus==="ACTIVE"?"ACTIVE":"INACTIVE"])].map(row=>row.map(csv).join(",")).join("\n");
  await prisma.adminAuditLog.create({ data: { adminUserId: admin.id, action: "CUSTOMER_USAGE_CSV_EXPORTED", targetEntity: "CustomerUsage", targetId: "filtered", detailsJson: { exportedCount: rows.length, filters }, ipAddress: admin.ipAddress } });
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="ratestack-customer-usage.csv"`, "cache-control": "private, no-store" } });
}
