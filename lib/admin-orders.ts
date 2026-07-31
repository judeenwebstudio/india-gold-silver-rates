import "server-only";

import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { ShopOrderStatus, ShopShipmentStatus, TrackingEventSource } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { canTransitionOrder, publicStatusMessage } from "@/lib/admin-order-transitions";
import { enqueueOrderEvent } from "@/lib/notifications/outbox";
import { hasOrderAdminPermission, resolveAdminRole, type OrderAdminPermission } from "@/lib/admin-permissions";
export { ORDER_STATUSES, SHIPMENT_STATUSES, allowedNextStatuses, canTransitionOrder, publicStatusMessage } from "@/lib/admin-order-transitions";

const limits = new Map<string,{count:number;reset:number}>();

export async function requireOrderAdmin(permission:OrderAdminPermission="view") {
  const session = await auth();
  if (!session?.user?.email) throw new Error("ADMIN_UNAUTHORIZED");
  const admin = await prisma.adminUser.findUnique({ where:{email:session.user.email}, select:{id:true,email:true,name:true,role:true,isActive:true} });
  if (!admin?.isActive) throw new Error("ADMIN_FORBIDDEN");
  const role=resolveAdminRole(admin.role,admin.email);
  if (!hasOrderAdminPermission(role,permission)) throw new Error("ADMIN_FORBIDDEN");
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("host");
  if (origin && host && new URL(origin).host !== host) throw new Error("CSRF_REJECTED");
  const key=`${admin.id}:${permission}`; const now=Date.now(); const current=limits.get(key);
  if (!current || current.reset < now) limits.set(key,{count:1,reset:now+60_000});
  else if (current.count >= 60) throw new Error("ADMIN_RATE_LIMITED");
  else current.count++;
  return { ...admin, role, ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || null };
}

export async function recordAdminAudit(admin:{id:string;ipAddress:string|null}, action:string, targetId:string, details:Prisma.InputJsonValue={}) {
  await prisma.adminAuditLog.create({data:{adminUserId:admin.id,action,targetEntity:"ShopOrder",targetId,detailsJson:details,ipAddress:admin.ipAddress}});
}

export async function transitionOrder(orderId:string, to:ShopOrderStatus, admin:{id:string;ipAddress:string|null}, internalNote?:string, source:TrackingEventSource="ADMIN") {
  const order=await prisma.shopOrder.findUnique({where:{id:orderId},select:{orderStatus:true}});
  if(!order) throw new Error("ORDER_NOT_FOUND");
  if(!canTransitionOrder(order.orderStatus,to)) throw new Error(`INVALID_ORDER_TRANSITION:${order.orderStatus}:${to}`);
  const message=publicStatusMessage(to);
  await prisma.$transaction(async tx=>{
    await tx.shopOrder.update({where:{id:orderId},data:{orderStatus:to,deliveredAt:to==="DELIVERED"?new Date():undefined}});
    await tx.orderStatusHistory.create({data:{orderId,status:to,publicMessage:message,internalNote:internalNote||null,source,adminUserId:admin.id}});
    await tx.shipmentTrackingEvent.create({data:{orderId,status:to,publicMessage:message,internalNote:internalNote||null,source,adminUserId:admin.id}});
    await tx.adminAuditLog.create({data:{adminUserId:admin.id,action:"ORDER_STATUS_CHANGED",targetEntity:"ShopOrder",targetId:orderId,detailsJson:{from:order.orderStatus,to},ipAddress:admin.ipAddress}});
  });
  await enqueueOrderEvent(orderId,to);
}

export const shipmentToOrderStatus = (status:ShopShipmentStatus):ShopOrderStatus|null => ({
  SHIPPED:"SHIPPED",IN_TRANSIT:"IN_TRANSIT",OUT_FOR_DELIVERY:"OUT_FOR_DELIVERY",DELIVERED:"DELIVERED",CANCELLED:"CANCELLED",RETURNED:"RETURNED",
} as Partial<Record<ShopShipmentStatus,ShopOrderStatus>>)[status] ?? null;
