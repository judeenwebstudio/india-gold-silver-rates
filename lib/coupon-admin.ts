import "server-only";import { requireOrderAdmin } from "@/lib/admin-orders";
export async function requireCouponAdmin(){const admin=await requireOrderAdmin("status");if(!["SUPER_ADMIN","ORDER_MANAGER"].includes(admin.role))throw new Error("ADMIN_FORBIDDEN");return admin;}
