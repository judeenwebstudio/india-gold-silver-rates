import { CustomerActivityPlatform, CustomerLoginMethod } from "@/generated/prisma/client";

export type UsageActivity = {
  platform: CustomerActivityPlatform;
  loginMethod: CustomerLoginMethod;
  loggedInAt?: Date | null;
  lastSeenAt?: Date | null;
  appVersion?: string | null;
};

export type UsageUserValue = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  accountStatus: string;
  platformActivities?: UsageActivity[] | null;
};

export function usageMetricsFromGroups(
  registered: number | null | undefined,
  groups: Array<{ customerId: string; platform: CustomerActivityPlatform }> | null | undefined,
  activeToday: Array<{ customerId: string }> | null | undefined,
  active7: Array<{ customerId: string }> | null | undefined,
  active30: Array<{ customerId: string }> | null | undefined,
) {
  const registeredCount = registered ?? 0;
  const byCustomer = new Map<string, Set<CustomerActivityPlatform>>();
  for (const row of groups ?? []) byCustomer.set(row.customerId, (byCustomer.get(row.customerId) ?? new Set()).add(row.platform));
  const values = [...byCustomer.values()];
  return {
    registered: registeredCount,
    unique: values.length,
    android: values.filter(value => value.has(CustomerActivityPlatform.ANDROID)).length,
    web: values.filter(value => value.has(CustomerActivityPlatform.WEB)).length,
    both: values.filter(value => value.size === 2).length,
    activeToday: activeToday?.length ?? 0,
    active7: active7?.length ?? 0,
    active30: active30?.length ?? 0,
    never: Math.max(0, registeredCount - values.length),
  };
}

export function usageRow(user: UsageUserValue) {
  const activities = (Array.isArray(user.platformActivities) ? user.platformActivities : []).filter(
    (activity): activity is UsageActivity => Boolean(activity?.platform && activity?.loginMethod),
  );
  const platforms = new Set(activities.map(activity => activity.platform));
  const android = activities.filter(activity => activity.platform === CustomerActivityPlatform.ANDROID);
  const dates = activities.map(activity => activity.lastSeenAt).filter((date): date is Date => date instanceof Date);
  return {
    ...user,
    platformActivities: activities,
    platform: platforms.size === 2 ? "Both" : platforms.has(CustomerActivityPlatform.ANDROID) ? "Android" : platforms.has(CustomerActivityPlatform.WEB) ? "Website" : "Never",
    methods: [...new Set(activities.map(activity => activity.loginMethod))].join(", ") || "—",
    firstLogin: activities.find(activity => activity.loggedInAt instanceof Date)?.loggedInAt ?? null,
    lastLogin: [...activities].reverse().find(activity => activity.loggedInAt instanceof Date)?.loggedInAt ?? null,
    lastActive: dates.length ? new Date(Math.max(...dates.map(date => date.getTime()))) : null,
    loginCount: activities.filter(activity => activity.loginMethod !== CustomerLoginMethod.SESSION_RESTORE).length,
    appVersion: android.at(-1)?.appVersion ?? null,
  };
}
