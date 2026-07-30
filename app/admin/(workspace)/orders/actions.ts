"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { allowedNextStatuses, publicStatusMessage, requireOrderAdmin, shipmentToOrderStatus, transitionOrder } from "@/lib/admin-orders";
import { verifyRazorpaySignature } from "@/lib/schemes/razorpay";
import { checkPhonePePaymentStatus } from "@/lib/schemes/phonepe";
import type { ShopOrderStatus, ShopShipmentStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const idSchema=z.string().cuid();
const text=(value:FormDataEntryValue|null,max=500)=>z.string().trim().min(1).max(max).parse(value);
const optionalDate=(value:FormDataEntryValue|null)=>typeof value==="string"&&value?new Date(value):null;
const done=(orderId:string,message:string,error=false)=>{revalidatePath("/admin/orders");revalidatePath(`/admin/orders/${orderId}`);redirect(`/admin/orders/${orderId}?${error?"error":"notice"}=${encodeURIComponent(message)}`);};
const failure=(error:unknown)=>{
  if(error instanceof Error&&"digest" in error&&typeof error.digest==="string"&&error.digest.startsWith("NEXT_REDIRECT"))throw error;
  return error instanceof Error?error.message:"Admin action failed.";
};

export async function updateOrderStatusAction(formData:FormData){
  const orderId=idSchema.parse(formData.get("orderId"));
  try{const admin=await requireOrderAdmin("status");const status=text(formData.get("status"),40) as ShopOrderStatus;await transitionOrder(orderId,status,admin,String(formData.get("internalNote")||""));done(orderId,`Order moved to ${status}.`);}catch(error){done(orderId,failure(error),true);}
}

export async function addOrderNoteAction(formData:FormData){
  const orderId=idSchema.parse(formData.get("orderId"));
  try{const admin=await requireOrderAdmin("note");const body=text(formData.get("body"),2000);await prisma.$transaction([
    prisma.adminOrderNote.create({data:{orderId,body,adminUserId:admin.id}}),
    prisma.adminAuditLog.create({data:{adminUserId:admin.id,action:"ADMIN_NOTE_ADDED",targetEntity:"ShopOrder",targetId:orderId,detailsJson:{length:body.length},ipAddress:admin.ipAddress}}),
  ]);done(orderId,"Private note added.");}catch(error){done(orderId,failure(error),true);}
}

export async function updateShipmentAction(formData:FormData){
  const orderId=idSchema.parse(formData.get("orderId"));
  try{
    const admin=await requireOrderAdmin("shipment");const status=text(formData.get("shipmentStatus"),40) as ShopShipmentStatus;
    const order=await prisma.shopOrder.findUniqueOrThrow({where:{id:orderId}});
    const publicMessage=text(formData.get("publicMessage"),500);
    const internalNote=String(formData.get("internalNote")||"").trim()||null;
    const next=shipmentToOrderStatus(status);
    if(next&&next!==order.orderStatus&&!allowedNextStatuses(order.orderStatus).includes(next))throw new Error(`INVALID_ORDER_TRANSITION:${order.orderStatus}:${next}`);
    await prisma.$transaction(async tx=>{
      await tx.shopOrder.update({where:{id:orderId},data:{
        courierPartner:String(formData.get("courierPartner")||"").trim()||null,
        trackingNumber:String(formData.get("trackingNumber")||"").trim()||null,
        shipmentId:String(formData.get("shipmentId")||"").trim()||null,
        publicTrackingUrl:String(formData.get("publicTrackingUrl")||"").trim()||null,
        shipmentStatus:status,pickupAt:optionalDate(formData.get("pickupAt")),expectedDeliveryAt:optionalDate(formData.get("expectedDeliveryAt")),
        deliveredAt:status==="DELIVERED"?new Date():order.deliveredAt,orderStatus:next&&next!==order.orderStatus?next:undefined,
      }});
      await tx.shipmentTrackingEvent.create({data:{orderId,status,publicMessage,internalNote,source:"ADMIN",adminUserId:admin.id}});
      if(next&&next!==order.orderStatus)await tx.orderStatusHistory.create({data:{orderId,status:next,publicMessage:publicStatusMessage(next),internalNote,source:"ADMIN",adminUserId:admin.id}});
      await tx.adminAuditLog.create({data:{adminUserId:admin.id,action:"SHIPMENT_UPDATED",targetEntity:"ShopOrder",targetId:orderId,detailsJson:{status,trackingNumber:String(formData.get("trackingNumber")||"")},ipAddress:admin.ipAddress}});
    });done(orderId,"Shipment and customer tracking updated.");
  }catch(error){done(orderId,failure(error),true);}
}

export async function verifyPaymentAction(formData:FormData){
  const orderId=idSchema.parse(formData.get("orderId"));
  try{
    const admin=await requireOrderAdmin("payment");
    const order=await prisma.shopOrder.findUniqueOrThrow({where:{id:orderId},include:{paymentVerification:true}});
    if(order.paymentVerification||order.paymentStatus==="SUCCESS")throw new Error("Payment was already verified.");
    let verified=false;let signatureValid:boolean|null=null;let message="Gateway could not verify payment.";let response:Prisma.InputJsonValue={};
    if(order.gateway==="RAZORPAY"){
      signatureValid=Boolean(order.gatewayOrderId&&order.gatewayPaymentId&&order.gatewaySignature&&verifyRazorpaySignature(order.gatewayOrderId,order.gatewayPaymentId,order.gatewaySignature));
      verified=signatureValid;message=verified?"Razorpay signature verified.":"Razorpay signature mismatch or missing.";
    }else if(order.gateway==="PHONEPE"&&order.gatewayOrderId){
      const result=await checkPhonePePaymentStatus(order.gatewayOrderId);verified=result.success;message=result.message;response={code:result.code};
    }
    await prisma.$transaction(async tx=>{
      await tx.paymentVerification.create({data:{orderId,gateway:order.gateway,gatewayOrderId:order.gatewayOrderId,gatewayPaymentId:order.gatewayPaymentId,verifiedAmountPaise:verified?order.totalAmountPaise:null,signatureValid,result:verified?"VERIFIED":"FAILED",resultMessage:message,responseJson:response,adminUserId:admin.id}});
      if(verified){
        await tx.shopOrder.update({where:{id:orderId},data:{paymentStatus:"SUCCESS",orderStatus:"PAYMENT_VERIFIED",paidAt:order.paidAt||new Date(),invoiceNumber:order.invoiceNumber||`INV-${order.orderNumber}`}});
        await tx.orderStatusHistory.create({data:{orderId,status:"PAYMENT_VERIFIED",publicMessage:publicStatusMessage("PAYMENT_VERIFIED"),source:"PAYMENT_GATEWAY",adminUserId:admin.id}});
        await tx.shipmentTrackingEvent.create({data:{orderId,status:"PAYMENT_VERIFIED",publicMessage:publicStatusMessage("PAYMENT_VERIFIED"),source:"PAYMENT_GATEWAY",adminUserId:admin.id}});
      }
      await tx.adminAuditLog.create({data:{adminUserId:admin.id,action:"PAYMENT_VERIFICATION_ATTEMPT",targetEntity:"ShopOrder",targetId:orderId,detailsJson:{gateway:order.gateway,verified,message},ipAddress:admin.ipAddress}});
    });done(orderId,message,!verified);
  }catch(error){done(orderId,failure(error),true);}
}

export async function cancelOrderAction(formData:FormData){
  const orderId=idSchema.parse(formData.get("orderId"));
  try{
    const admin=await requireOrderAdmin("status");const reason=text(formData.get("reason"),1000);
    const order=await prisma.shopOrder.findUniqueOrThrow({where:{id:orderId}});
    if(order.orderStatus==="DELIVERED")throw new Error("Delivered orders require the return workflow.");
    if(!allowedNextStatuses(order.orderStatus).includes("CANCELLED"))throw new Error(`Cannot cancel an order in ${order.orderStatus}.`);
    const paymentCaptured=formData.get("paymentCaptured")==="on",refundRequired=formData.get("refundRequired")==="on",shipmentCreated=formData.get("shipmentCreated")==="on";
    await prisma.shopOrder.update({where:{id:orderId},data:{cancellationReason:reason,cancellationPaymentCaptured:paymentCaptured,cancellationRefundRequired:refundRequired,cancellationShipmentCreated:shipmentCreated}});
    await transitionOrder(orderId,"CANCELLED",admin,reason);
    if(refundRequired&&allowedNextStatuses("CANCELLED").includes("REFUND_PENDING"))await transitionOrder(orderId,"REFUND_PENDING",admin,"Refund required after cancellation.");
    done(orderId,"Order cancellation recorded.");
  }catch(error){done(orderId,failure(error),true);}
}

export async function initiateRefundAction(formData:FormData){
  const orderId=idSchema.parse(formData.get("orderId"));
  try{
    const admin=await requireOrderAdmin("refund");const reason=text(formData.get("reason"),1000);
    const order=await prisma.shopOrder.findUniqueOrThrow({where:{id:orderId}});
    if(!["PAYMENT_VERIFIED","CANCELLED","RETURNED","REFUND_PENDING"].includes(order.orderStatus))throw new Error(`Refunds cannot be initiated while an order is ${order.orderStatus}.`);
    const amount=Math.round(Number(formData.get("amount"))*100);
    if(!Number.isSafeInteger(amount)||amount<=0||BigInt(amount)>order.totalAmountPaise)throw new Error("Invalid refund amount.");
    await prisma.$transaction(async tx=>{
      await tx.shopRefund.create({data:{orderId,amountPaise:BigInt(amount),reason,status:"PENDING",adminUserId:admin.id}});
      if(order.orderStatus!=="REFUND_PENDING"){
        await tx.shopOrder.update({where:{id:orderId},data:{orderStatus:"REFUND_PENDING"}});
        await tx.orderStatusHistory.create({data:{orderId,status:"REFUND_PENDING",publicMessage:publicStatusMessage("REFUND_PENDING"),internalNote:reason,source:"ADMIN",adminUserId:admin.id}});
      }
      await tx.adminAuditLog.create({data:{adminUserId:admin.id,action:"REFUND_INITIATED",targetEntity:"ShopOrder",targetId:orderId,detailsJson:{amountPaise:amount,reason},ipAddress:admin.ipAddress}});
    });done(orderId,"Refund marked pending for gateway processing.");
  }catch(error){done(orderId,failure(error),true);}
}

export async function bulkOrderAction(formData:FormData){
  try{
    const admin=await requireOrderAdmin("status");const target=text(formData.get("target"),40) as ShopOrderStatus;
    if(!["PROCESSING","PACKED","READY_TO_SHIP"].includes(target))throw new Error("Unsafe bulk action.");
    const ids=formData.getAll("orderIds").map(String).filter(Boolean).slice(0,100);
    for(const id of ids){const order=await prisma.shopOrder.findUnique({where:{id},select:{orderStatus:true}});if(order&&allowedNextStatuses(order.orderStatus).includes(target))await transitionOrder(id,target,admin,"Bulk admin action.");}
    revalidatePath("/admin/orders");redirect("/admin/orders?notice=Bulk+action+completed");
  }catch(error){redirect(`/admin/orders?error=${encodeURIComponent(failure(error))}`);}
}
