import "server-only";
import { prisma } from "@/lib/prisma";
import { PermanentNotificationError, sendEmail, sendPush } from "./providers";
import { safeDeepLink } from "./outbox";

export async function processNotificationBatch(limit=25){
  const rows=await prisma.notificationOutbox.findMany({where:{status:{in:["PENDING","FAILED"]},scheduledAt:{lte:new Date()},attemptCount:{lt:5}},orderBy:{scheduledAt:"asc"},take:Math.min(50,Math.max(1,limit))});
  let sent=0,failed=0,disabled=0;
  for(const row of rows){
    const claimed=await prisma.notificationOutbox.updateMany({where:{id:row.id,status:row.status},data:{status:"PROCESSING",attemptCount:{increment:1}}});if(!claimed.count)continue;
    try{
      let result:{disabled:boolean;messageId:string|null};
      if(row.channel==="EMAIL")result=await sendEmail(row);
      else {
        const devices=row.customerId?await prisma.pushDeviceToken.findMany({where:{customerId:row.customerId,isActive:true},select:{id:true,token:true}}):[];
        if(!devices.length){await prisma.notificationOutbox.update({where:{id:row.id},data:{status:"FAILED",failedAt:new Date(),failureReason:"No active device token.",scheduledAt:new Date(Date.now()+3600_000)}});failed++;continue}
        const payload=(row.payloadJson||{}) as Record<string,unknown>;let last:string|null=null;
        for(const device of devices)try{const response=await sendPush(device.token,row.title,row.body,{deepLink:safeDeepLink(payload.deepLink),channel:String(payload.channel||"orders")});last=response.messageId;if(response.disabled){disabled++;break}}catch(error){if(error instanceof PermanentNotificationError){await prisma.pushDeviceToken.update({where:{id:device.id},data:{isActive:false,revokedAt:new Date()}});continue}throw error}
        result={disabled:false,messageId:last};
      }
      if(result.disabled){await prisma.notificationOutbox.update({where:{id:row.id},data:{status:"PENDING",failureReason:"Provider disabled."}});disabled++;continue}
      await prisma.notificationOutbox.update({where:{id:row.id},data:{status:"SENT",sentAt:new Date(),failedAt:null,failureReason:null,providerMessageId:result.messageId}});sent++;
    }catch(error){const permanent=error instanceof PermanentNotificationError,current=row.attemptCount+1;await prisma.notificationOutbox.update({where:{id:row.id},data:{status:permanent||current>=5?"FAILED":"PENDING",failedAt:new Date(),failureReason:error instanceof Error?error.message.slice(0,500):"Delivery failed.",scheduledAt:new Date(Date.now()+Math.min(6*3600_000,30_000*2**current))}});failed++}
  }
  return {processed:rows.length,sent,failed,disabled};
}
