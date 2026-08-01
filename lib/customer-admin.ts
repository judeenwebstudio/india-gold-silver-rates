import "server-only";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission, resolveAdminRole, type AdminPermission } from "@/lib/admin-permissions";

export async function requireCustomerAdmin(permission: AdminPermission = "CUSTOMER_USAGE_VIEW") {
  const session = await auth();
  if (!session?.user?.email) throw new Error("ADMIN_UNAUTHORIZED");
  const admin = await prisma.adminUser.findUnique({ where: { email: session.user.email }, select: { id: true, email: true, role: true, isActive: true } });
  if (!admin?.isActive) throw new Error("ADMIN_FORBIDDEN");
  const role = resolveAdminRole(admin.role, admin.email);
  if (!hasAdminPermission(role, permission)) throw new Error("ADMIN_FORBIDDEN");
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin"), host = requestHeaders.get("host");
  if (origin && host && new URL(origin).host !== host) throw new Error("CSRF_REJECTED");
  return { ...admin, role, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null };
}

export const maskEmail = (value: string | null) => !value ? "—" : value.replace(/^(.).+(@.+)$/, "$1***$2");
export const maskPhone = (value: string | null) => !value ? "—" : `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
