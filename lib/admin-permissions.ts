import "server-only";
import type { AdminRole } from "@/generated/prisma/enums";
export type AdminPermission="REPORTS_VIEW"|"REPORTS_EXPORT"|"PROFIT_VIEW"|"GST_VIEW"|"COURIER_REPORT_VIEW"|"NOTIFICATION_VIEW"|"NOTIFICATION_SEND"|"EMAIL_RESEND";
const grants:Record<AdminPermission,AdminRole[]>={
  REPORTS_VIEW:["SUPER_ADMIN","ORDER_MANAGER","FINANCE","FULFILLMENT","VIEWER"],
  REPORTS_EXPORT:["SUPER_ADMIN","ORDER_MANAGER","FINANCE"],
  PROFIT_VIEW:["SUPER_ADMIN","FINANCE"],
  GST_VIEW:["SUPER_ADMIN","FINANCE"],
  COURIER_REPORT_VIEW:["SUPER_ADMIN","ORDER_MANAGER","FULFILLMENT"],
  NOTIFICATION_VIEW:["SUPER_ADMIN","ORDER_MANAGER","SUPPORT"],
  NOTIFICATION_SEND:["SUPER_ADMIN","ORDER_MANAGER"],
  EMAIL_RESEND:["SUPER_ADMIN","ORDER_MANAGER","SUPPORT"],
};
export function hasAdminPermission(role:AdminRole,permission:AdminPermission){return grants[permission].includes(role)}
