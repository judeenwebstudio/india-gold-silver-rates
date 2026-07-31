import "server-only";
import type { AdminRole } from "@/generated/prisma/enums";
export type AdminPermission="REPORTS_VIEW"|"REPORTS_EXPORT"|"PROFIT_VIEW"|"GST_VIEW"|"COURIER_REPORT_VIEW"|"NOTIFICATION_VIEW"|"NOTIFICATION_SEND"|"EMAIL_RESEND";
export type OrderAdminPermission="view"|"status"|"payment"|"refund"|"shipment"|"note"|"export"|"shiprocket";
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
const orderGrants:Record<OrderAdminPermission,AdminRole[]>={
  view:["SUPER_ADMIN","ORDER_MANAGER","FINANCE","FULFILLMENT","SUPPORT","VIEWER"],
  status:["SUPER_ADMIN","ORDER_MANAGER","FULFILLMENT"],
  payment:["SUPER_ADMIN","FINANCE"],
  refund:["SUPER_ADMIN","FINANCE"],
  shipment:["SUPER_ADMIN","ORDER_MANAGER","FULFILLMENT"],
  note:["SUPER_ADMIN","ORDER_MANAGER","FINANCE","FULFILLMENT","SUPPORT"],
  export:["SUPER_ADMIN","ORDER_MANAGER","FINANCE"],
  shiprocket:["SUPER_ADMIN","ORDER_MANAGER","FULFILLMENT"],
};
export const DEFAULT_ADMIN_EMAIL="admin@indiagoldrates.local";
export function isDefaultAdministrator(email:string){
  const normalized=email.trim().toLowerCase();
  const configured=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return normalized===DEFAULT_ADMIN_EMAIL||Boolean(configured&&normalized===configured);
}
export function resolveAdminRole(role:AdminRole,email:string):AdminRole{
  return role==="SUPER_ADMIN"||isDefaultAdministrator(email)?"SUPER_ADMIN":role;
}
export function hasAdminPermission(role:AdminRole,permission:AdminPermission){return role==="SUPER_ADMIN"||grants[permission].includes(role)}
export function hasOrderAdminPermission(role:AdminRole,permission:OrderAdminPermission){return role==="SUPER_ADMIN"||orderGrants[permission].includes(role)}
