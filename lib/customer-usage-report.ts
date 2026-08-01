import "server-only";
import { CustomerActivityPlatform, CustomerLoginMethod, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfIstDay } from "@/lib/customer-activity";
import { usageMetricsFromGroups } from "@/lib/customer-usage-values";

export { usageRow } from "@/lib/customer-usage-values";

export type UsageFilters = { q?: string; platform?: string; status?: string; active?: string; from?: string; to?: string; method?: string; page?: string };

function activityStorageUnavailable(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2021") return false;
  const meta = error.meta as { modelName?: unknown; table?: unknown } | undefined;
  return meta?.modelName === "CustomerPlatformActivity" || String(meta?.table || "").includes("CustomerPlatformActivity") || error.message.includes("CustomerPlatformActivity");
}

function reportUnavailableStorage(operation: string) {
  console.error("customer_usage_activity_storage_unavailable", { operation, prismaCode: "P2021", requiredMigration: "20260801123000_add_customer_platform_activity" });
}
const since = (filters: UsageFilters) => {
  const now = new Date();
  if (filters.active === "today") return startOfIstDay(now);
  if (filters.active === "7") return new Date(now.getTime() - 7 * 86400_000);
  if (filters.active === "30") return new Date(now.getTime() - 30 * 86400_000);
  if (filters.active === "custom" && filters.from) return new Date(`${filters.from}T00:00:00+05:30`);
  return null;
};

function usageBaseWhere(filters: UsageFilters): Prisma.SchemeUserWhereInput {
  return {
    ...(filters.q ? { OR: [{ fullName: { contains: filters.q, mode: "insensitive" } }, { phone: { contains: filters.q } }, { email: { contains: filters.q, mode: "insensitive" } }] } : {}),
    ...(filters.status === "active" ? { isActive: true, accountStatus: "ACTIVE" } : filters.status === "inactive" ? { OR: [{ isActive: false }, { accountStatus: { not: "ACTIVE" } }] } : {}),
  };
}

export function usageWhere(filters: UsageFilters): Prisma.SchemeUserWhereInput {
  const activityWhere: Prisma.CustomerPlatformActivityWhereInput = {};
  const activeSince = since(filters);
  if (activeSince) activityWhere.lastSeenAt = { gte: activeSince, ...(filters.active === "custom" && filters.to ? { lte: new Date(`${filters.to}T23:59:59.999+05:30`) } : {}) };
  if (Object.values(CustomerLoginMethod).includes(filters.method as CustomerLoginMethod)) activityWhere.loginMethod = filters.method as CustomerLoginMethod;
  const where: Prisma.SchemeUserWhereInput = {
    ...usageBaseWhere(filters),
    ...(Object.keys(activityWhere).length ? { platformActivities: { some: activityWhere } } : {}),
  };
  if (filters.platform === "web") where.platformActivities = { some: { ...activityWhere, platform: CustomerActivityPlatform.WEB } };
  if (filters.platform === "android") where.platformActivities = { some: { ...activityWhere, platform: CustomerActivityPlatform.ANDROID } };
  if (filters.platform === "both") where.AND = [
    { platformActivities: { some: { ...activityWhere, platform: CustomerActivityPlatform.WEB } } },
    { platformActivities: { some: { ...activityWhere, platform: CustomerActivityPlatform.ANDROID } } },
  ];
  return where;
}

export async function customerUsageMetrics() {
  const today = startOfIstDay(), now = Date.now();
  const registered = await prisma.schemeUser.count();
  let groups: Array<{ customerId: string; platform: CustomerActivityPlatform }> = [], activeToday: Array<{ customerId: string }> = [], active7: Array<{ customerId: string }> = [], active30: Array<{ customerId: string }> = [];
  try {
    [groups, activeToday, active7, active30] = await Promise.all([
      prisma.customerPlatformActivity.groupBy({ by: ["customerId", "platform"] }),
      prisma.customerPlatformActivity.groupBy({ by: ["customerId"], where: { lastSeenAt: { gte: today } } }),
      prisma.customerPlatformActivity.groupBy({ by: ["customerId"], where: { lastSeenAt: { gte: new Date(now - 7 * 86400_000) } } }),
      prisma.customerPlatformActivity.groupBy({ by: ["customerId"], where: { lastSeenAt: { gte: new Date(now - 30 * 86400_000) } } }),
    ]);
  } catch (error) {
    if (!activityStorageUnavailable(error)) throw error;
    reportUnavailableStorage("metrics");
  }
  return usageMetricsFromGroups(registered, groups, activeToday, active7, active30);
}

export async function customerUsageRows(filters: UsageFilters, take = 25, skip?: number) {
  try {
    return await prisma.schemeUser.findMany({
      where: usageWhere(filters), orderBy: { createdAt: "desc" }, take, ...(skip == null ? {} : { skip }),
      select: { id: true, fullName: true, phone: true, email: true, isActive: true, accountStatus: true, platformActivities: { orderBy: { loggedInAt: "asc" }, select: { platform: true, loginMethod: true, loggedInAt: true, lastSeenAt: true, appVersion: true } } },
    });
  } catch (error) {
    if (!activityStorageUnavailable(error)) throw error;
    reportUnavailableStorage("rows");
    return [];
  }
}

export async function customerUsageCount(filters: UsageFilters) {
  try {
    return await prisma.schemeUser.count({ where: usageWhere(filters) });
  } catch (error) {
    if (!activityStorageUnavailable(error)) throw error;
    reportUnavailableStorage("count");
    return 0;
  }
}
