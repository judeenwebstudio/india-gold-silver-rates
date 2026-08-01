import "server-only";
import { CustomerActivityPlatform, CustomerLoginMethod, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfIstDay } from "@/lib/customer-activity";

export type UsageFilters = { q?: string; platform?: string; status?: string; active?: string; from?: string; to?: string; method?: string; page?: string };
const since = (filters: UsageFilters) => {
  const now = new Date();
  if (filters.active === "today") return startOfIstDay(now);
  if (filters.active === "7") return new Date(now.getTime() - 7 * 86400_000);
  if (filters.active === "30") return new Date(now.getTime() - 30 * 86400_000);
  if (filters.active === "custom" && filters.from) return new Date(`${filters.from}T00:00:00+05:30`);
  return null;
};

export function usageWhere(filters: UsageFilters): Prisma.SchemeUserWhereInput {
  const activityWhere: Prisma.CustomerPlatformActivityWhereInput = {};
  const activeSince = since(filters);
  if (activeSince) activityWhere.lastSeenAt = { gte: activeSince, ...(filters.active === "custom" && filters.to ? { lte: new Date(`${filters.to}T23:59:59.999+05:30`) } : {}) };
  if (Object.values(CustomerLoginMethod).includes(filters.method as CustomerLoginMethod)) activityWhere.loginMethod = filters.method as CustomerLoginMethod;
  const where: Prisma.SchemeUserWhereInput = {
    ...(filters.q ? { OR: [{ fullName: { contains: filters.q, mode: "insensitive" } }, { phone: { contains: filters.q } }, { email: { contains: filters.q, mode: "insensitive" } }] } : {}),
    ...(filters.status === "active" ? { isActive: true, accountStatus: "ACTIVE" } : filters.status === "inactive" ? { OR: [{ isActive: false }, { accountStatus: { not: "ACTIVE" } }] } : {}),
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
  const [registered, groups, activeToday, active7, active30] = await Promise.all([
    prisma.schemeUser.count(),
    prisma.customerPlatformActivity.groupBy({ by: ["customerId", "platform"] }),
    prisma.customerPlatformActivity.groupBy({ by: ["customerId"], where: { lastSeenAt: { gte: today } } }),
    prisma.customerPlatformActivity.groupBy({ by: ["customerId"], where: { lastSeenAt: { gte: new Date(now - 7 * 86400_000) } } }),
    prisma.customerPlatformActivity.groupBy({ by: ["customerId"], where: { lastSeenAt: { gte: new Date(now - 30 * 86400_000) } } }),
  ]);
  const byCustomer = new Map<string, Set<CustomerActivityPlatform>>();
  for (const row of groups) byCustomer.set(row.customerId, (byCustomer.get(row.customerId) || new Set()).add(row.platform));
  const values = [...byCustomer.values()];
  return { registered, unique: values.length, android: values.filter(x => x.has(CustomerActivityPlatform.ANDROID)).length, web: values.filter(x => x.has(CustomerActivityPlatform.WEB)).length, both: values.filter(x => x.size === 2).length, activeToday: activeToday.length, active7: active7.length, active30: active30.length, never: registered - values.length };
}

export async function customerUsageRows(filters: UsageFilters, take = 25, skip?: number) {
  return prisma.schemeUser.findMany({
    where: usageWhere(filters), orderBy: { createdAt: "desc" }, take, ...(skip == null ? {} : { skip }),
    select: { id: true, fullName: true, phone: true, email: true, isActive: true, accountStatus: true, platformActivities: { orderBy: { loggedInAt: "asc" }, select: { platform: true, loginMethod: true, loggedInAt: true, lastSeenAt: true, appVersion: true } } },
  });
}

export function usageRow(user: Awaited<ReturnType<typeof customerUsageRows>>[number]) {
  const platforms = new Set(user.platformActivities.map(x => x.platform));
  const android = user.platformActivities.filter(x => x.platform === CustomerActivityPlatform.ANDROID);
  return { ...user, platform: platforms.size === 2 ? "Both" : platforms.has(CustomerActivityPlatform.ANDROID) ? "Android" : platforms.has(CustomerActivityPlatform.WEB) ? "Website" : "Never", methods: [...new Set(user.platformActivities.map(x => x.loginMethod))].join(", ") || "—", firstLogin: user.platformActivities[0]?.loggedInAt || null, lastLogin: user.platformActivities.at(-1)?.loggedInAt || null, lastActive: user.platformActivities.reduce<Date | null>((max, x) => !max || x.lastSeenAt > max ? x.lastSeenAt : max, null), loginCount: user.platformActivities.filter(x => x.loginMethod !== CustomerLoginMethod.SESSION_RESTORE).length, appVersion: android.at(-1)?.appVersion || null };
}
