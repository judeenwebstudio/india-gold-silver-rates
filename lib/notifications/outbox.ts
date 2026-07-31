import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { NotificationChannel, Prisma } from "@/generated/prisma/client";

export type NotificationEvent={customerId?:string;shopOrderId?:string;eventType:string;title:string;body:string;payload?:Record<string,unknown>;channels?:NotificationChannel[];deduplicationKey?:string;scheduledAt?:Date};
const hash=(value:string)=>createHash("sha256").update(value).digest("hex").slice(0,32);
export function safeDeepLink(value:unknown){if(typeof value!=="string")return "/";if(/^\/(?:shop\/orders(?:\/[a-zA-Z0-9_-]+)?|profile|gold-rate|silver-rate)$/.test(value))return value;return "/"}

export async function enqueueNotification(event:NotificationEvent){
  const channels=event.channels||["PUSH","EMAIL"],base=event.deduplicationKey||hash(`${event.eventType}:${event.customerId||""}:${event.shopOrderId||""}:${JSON.stringify(event.payload||{})}`);
  return Promise.all(channels.map(channel=>prisma.notificationOutbox.upsert({where:{deduplicationKey:`${base}:${channel}`},update:{},create:{customerId:event.customerId,shopOrderId:event.shopOrderId,eventType:event.eventType,title:event.title,body:event.body,payloadJson:{...(event.payload||{}),deepLink:safeDeepLink(event.payload?.deepLink)} as Prisma.InputJsonValue,channel,deduplicationKey:`${base}:${channel}`,scheduledAt:event.scheduledAt||new Date()}})));
}

const orderCopy:Record<string,[string,string]>={
  PAYMENT_VERIFIED:["Payment Successful","Payment for order {orderId} was successful."],
  ORDER_CONFIRMED:["Order Confirmed","Your RateStack order {orderId} has been confirmed."],
  SHIPPED:["Order Shipped","Your order {orderId} has been shipped."],
  OUT_FOR_DELIVERY:["Out for Delivery","Your order {orderId} is out for delivery."],
  DELIVERED:["Order Delivered","Your order {orderId} has been delivered successfully."],
  PAYMENT_FAILED:["Payment Failed","Payment for order {orderId} could not be completed. No successful payment was recorded."],
  CANCELLED:["Order Cancelled","Your order {orderId} has been cancelled."],
  REFUND_PENDING:["Refund Initiated","A refund for order {orderId} has been initiated."],
  REFUNDED:["Refund Completed","The refund for order {orderId} has been completed."],
  SHIPMENT_DELAYED:["Shipment Delayed","Delivery of order {orderId} is delayed. We are monitoring the shipment."],
  DELIVERY_EXCEPTION:["Delivery Update","Order {orderId} needs delivery attention. Please review tracking for the latest update."],
};

export async function enqueueOrderEvent(orderId:string,eventType:string){
  const order=await prisma.shopOrder.findUnique({where:{id:orderId},select:{id:true,userId:true,orderNumber:true}});
  const copy=orderCopy[eventType];if(!order||!copy)return [];
  const tracking=["SHIPPED","OUT_FOR_DELIVERY","DELIVERED","SHIPMENT_DELAYED","DELIVERY_EXCEPTION"].includes(eventType);
  return enqueueNotification({customerId:order.userId,shopOrderId:order.id,eventType,title:copy[0],body:copy[1].replace("{orderId}",order.orderNumber),payload:{deepLink:"/shop/orders",destination:tracking?"TRACKING":"ORDER",orderId:order.id,tracking:String(tracking),channel:tracking?"delivery":"orders"},deduplicationKey:`order:${order.id}:${eventType}`});
}
