import "server-only";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import nodemailer from "nodemailer";
import { getEmailConfig, getFirebaseConfig } from "./config";
import { renderOrderEmail } from "./templates";
import { prisma } from "@/lib/prisma";

export class PermanentNotificationError extends Error{}
export async function sendPush(token:string,title:string,body:string,data:Record<string,string>){
  const config=getFirebaseConfig();if(!config.enabled)return {disabled:true,messageId:null};
  if(!config.valid)throw new PermanentNotificationError(`Firebase configuration incomplete: ${config.missing.join(", ")}`);
  if(!getApps().length)initializeApp({credential:cert({projectId:config.projectId,clientEmail:config.clientEmail,privateKey:config.privateKey})});
  try{return {disabled:false,messageId:await getMessaging().send({token,notification:{title,body},data,android:{notification:{channelId:data.channel||"orders"}}})}}
  catch(error){const code=String((error as {code?:string}).code||"");if(/registration-token-not-registered|invalid-registration-token/.test(code))throw new PermanentNotificationError(code);throw error}
}
export async function sendEmail(outbox:{eventType:string;title:string;body:string;shopOrderId:string|null}){
  const config=getEmailConfig();if(!config.enabled)return {disabled:true,messageId:null};if(!config.valid)throw new PermanentNotificationError("SMTP configuration is incomplete.");
  if(!outbox.shopOrderId)throw new PermanentNotificationError("Email event has no related order.");
  const order=await prisma.shopOrder.findUnique({where:{id:outbox.shopOrderId}});if(!order?.customerEmail)throw new PermanentNotificationError("Customer email is unavailable.");
  const transport=nodemailer.createTransport({host:config.host,port:config.port,secure:config.secure,auth:{user:config.user,pass:config.password}});
  const html=renderOrderEmail(outbox.eventType,{customerName:order.customerName||order.userId,orderNumber:order.orderNumber,createdAt:order.createdAt,productName:order.productName,purity:order.purity,weightGrams:order.weightGrams,quantity:order.quantity,totalAmountPaise:order.totalAmountPaise,orderStatus:order.orderStatus,courierPartner:order.courierPartner,trackingNumber:order.trackingNumber,expectedDeliveryAt:order.expectedDeliveryAt,publicTrackingUrl:order.publicTrackingUrl},config);
  const result=await transport.sendMail({from:{name:config.fromName,address:config.fromEmail},to:order.customerEmail,replyTo:config.replyTo||undefined,subject:outbox.title,text:outbox.body,html});
  return {disabled:false,messageId:result.messageId};
}
