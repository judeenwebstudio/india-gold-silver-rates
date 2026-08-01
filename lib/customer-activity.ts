import "server-only";
import crypto from "node:crypto";
import { CustomerActivityPlatform, CustomerLoginMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const ANDROID_HEADER = "x-ratestack-platform";
const THROTTLE_MS = 15 * 60_000;

export function customerPlatform(request: Request): CustomerActivityPlatform {
  return request.headers.get(ANDROID_HEADER) === "ANDROID"
    ? CustomerActivityPlatform.ANDROID
    : CustomerActivityPlatform.WEB;
}

function hash(value: string | null) {
  if (!value) return null;
  return crypto.createHmac("sha256", process.env.AUTH_SECRET || "ratestack-activity").update(value).digest("hex");
}

function metadata(request: Request) {
  const platform = customerPlatform(request);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  return {
    platform,
    deviceIdHash: hash(request.headers.get("x-ratestack-install-id")),
    appVersion: platform === CustomerActivityPlatform.ANDROID
      ? request.headers.get("x-ratestack-app-version")?.slice(0, 40) || null
      : null,
    userAgent: request.headers.get("user-agent")?.slice(0, 300) || null,
    ipHash: hash(ip),
  };
}

export async function recordSuccessfulCustomerLogin(
  customerId: string,
  method: CustomerLoginMethod,
  request: Request,
) {
  return prisma.customerPlatformActivity.create({ data: { customerId, loginMethod: method, ...metadata(request) } });
}

export async function touchCustomerSession(customerId: string, request: Request) {
  const details = metadata(request);
  const latest = await prisma.customerPlatformActivity.findFirst({
    where: { customerId, platform: details.platform, ...(details.deviceIdHash ? { deviceIdHash: details.deviceIdHash } : {}) },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true, lastSeenAt: true },
  });
  if (latest && Date.now() - latest.lastSeenAt.getTime() < THROTTLE_MS) return false;
  if (latest) {
    await prisma.customerPlatformActivity.update({ where: { id: latest.id }, data: { lastSeenAt: new Date(), appVersion: details.appVersion, userAgent: details.userAgent, ipHash: details.ipHash } });
  } else {
    await prisma.customerPlatformActivity.create({ data: { customerId, loginMethod: CustomerLoginMethod.SESSION_RESTORE, ...details } });
  }
  return true;
}

export function startOfIstDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return new Date(`${value("year")}-${value("month")}-${value("day")}T00:00:00+05:30`);
}
