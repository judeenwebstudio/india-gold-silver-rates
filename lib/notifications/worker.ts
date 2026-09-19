import "server-only";
import { prisma } from "@/lib/prisma";
import { PermanentNotificationError, sendEmail, sendPush } from "./providers";
import { safeDeepLink } from "./outbox";
import { withActiveCustomer } from "@/lib/customer-delivery";

export async function processNotificationBatch(limit=25){
  const rows=await prisma.notificationOutbox.findMany({where:{status:{in:["PENDING","FAILED"]},scheduledAt:{lte:new Date()},attemptCount:{lt:5}},orderBy:{scheduledAt:"asc"},take:Math.min(50,Math.max(1,limit))});
  let sent=0,failed=0,disabled=0,skipped=0;
  for(const row of rows){
    const order = row.shopOrderId ? await prisma.shopOrder.findUnique({where:{id:row.shopOrderId},select:{userId:true}}) : null;
    const customerId = order?.userId || row.customerId;
    if (!customerId) { skipped++; continue; }
    try {
    const processed = await withActiveCustomer(prisma, customerId, async tx => {
    const claimed=await tx.notificationOutbox.updateMany({where:{id:row.id,status:row.status},data:{status:"PROCESSING",attemptCount:{increment:1}}});if(!claimed.count){skipped++;return true}
    try{
      let result:{disabled:boolean;messageId:string|null};
      if(row.channel==="EMAIL")result=await sendEmail(row);
      else {
        const devices=await tx.pushDeviceToken.findMany({where:{customerId,isActive:true},select:{id:true,token:true}});
        if(!devices.length){await tx.notificationOutbox.update({where:{id:row.id},data:{status:"FAILED",failedAt:new Date(),failureReason:"No active device token.",scheduledAt:new Date(Date.now()+3600_000)}});failed++;return true}
        const payload=(row.payloadJson||{}) as Record<string,unknown>;let last:string|null=null;
        const data={deepLink:safeDeepLink(payload.deepLink),channel:String(payload.channel||"orders"),destination:String(payload.destination||"DASHBOARD"),orderId:String(payload.orderId||""),tracking:String(payload.tracking||"false"),metal:String(payload.metal||"")};
        for(const device of devices)try{const response=await sendPush(device.token,row.title,row.body,data);last=response.messageId;if(response.disabled){disabled++;break}}catch(error){if(error instanceof PermanentNotificationError){await tx.pushDeviceToken.update({where:{id:device.id},data:{isActive:false,revokedAt:new Date()}});continue}throw error}
        result={disabled:false,messageId:last};
      }
      if(result.disabled){await tx.notificationOutbox.update({where:{id:row.id},data:{status:"PENDING",failureReason:"Provider disabled."}});disabled++;skipped++;return true}
      await tx.notificationOutbox.update({where:{id:row.id},data:{status:"SENT",sentAt:new Date(),failedAt:null,failureReason:null,providerMessageId:result.messageId}});sent++;
    }catch(error){const permanent=error instanceof PermanentNotificationError,current=row.attemptCount+1;await tx.notificationOutbox.update({where:{id:row.id},data:{status:permanent||current>=5?"FAILED":"PENDING",failedAt:new Date(),failureReason:"Delivery failed.",scheduledAt:new Date(Date.now()+Math.min(6*3600_000,30_000*2**current))}});failed++}
    return true;
    });
    if (!processed) skipped++;
    } catch {
      // A transaction timeout/rollback must not recreate a deleted outbox row.
      failed++;
    }
  }
  return {processed:rows.length,sent,failed,skipped,disabled};
}
