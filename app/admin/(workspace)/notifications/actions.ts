"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireOrderAdmin, recordAdminAudit } from "@/lib/admin-orders";
import { enqueueNotification, safeDeepLink } from "@/lib/notifications/outbox";
const broadcastSchema=z.object({title:z.string().min(2).max(100),message:z.string().min(2).max(500),deepLink:z.string().max(200),audience:z.enum(["ALL","GOLD","SILVER"]),confirm:z.literal("CONFIRM")});
export async function retryNotificationAction(data:FormData){const admin=await requireOrderAdmin("status"),id=String(data.get("id")||"");await prisma.notificationOutbox.update({where:{id},data:{status:"PENDING",scheduledAt:new Date(),failedAt:null,failureReason:null}});await recordAdminAudit(admin,"NOTIFICATION_RETRIED",id);revalidatePath("/admin/notifications")}
export async function broadcastNotificationAction(data:FormData){const admin=await requireOrderAdmin("status"),parsed=broadcastSchema.safeParse(Object.fromEntries(data));if(!parsed.success)throw new Error("INVALID_BROADCAST");const deepLink=safeDeepLink(parsed.data.deepLink),users=await prisma.schemeUser.findMany({where:{isActive:true,...(parsed.data.audience==="ALL"?{}:{rateAlertPreferences:{some:{metal:parsed.data.audience,enabled:true}}})},select:{id:true},take:1000});const batch=`broadcast:${Date.now()}:${admin.id}`;await Promise.all(users.map(user=>enqueueNotification({customerId:user.id,eventType:"ADMIN_BROADCAST",title:parsed.data.title,body:parsed.data.message,channels:["PUSH"],payload:{deepLink,channel:"promotions"},deduplicationKey:`${batch}:${user.id}`})));await recordAdminAudit(admin,"NOTIFICATION_BROADCAST",batch,{audience:parsed.data.audience,recipientCount:users.length,deepLink});revalidatePath("/admin/notifications")}
