import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyTrackingUpdate } from "@/lib/shiprocket/service";
import type { Prisma } from "@/generated/prisma/client";

export const runtime="nodejs";export const dynamic="force-dynamic";
const equal=(provided:string,expected:string)=>{const a=Buffer.from(provided),b=Buffer.from(expected);return a.length===b.length&&timingSafeEqual(a,b)};
const text=(value:unknown)=>value==null?null:String(value);
export async function POST(request:Request){
  const secret=process.env.SHIPROCKET_WEBHOOK_SECRET||"",provided=request.headers.get("x-api-key")||"";
  if(!secret||!equal(provided,secret))return NextResponse.json({success:false,error:{code:"WEBHOOK_UNAUTHORISED",message:"Unauthorized."}},{status:401});
  if(!(request.headers.get("content-type")||"").includes("application/json"))return NextResponse.json({success:false,error:{code:"INVALID_REQUEST",message:"JSON required."}},{status:415});
  let payload:Record<string,unknown>;try{const raw=await request.text();if(raw.length>250_000)throw new Error();payload=JSON.parse(raw);if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new Error()}catch{return NextResponse.json({success:false,error:{code:"INVALID_REQUEST",message:"Invalid JSON."}},{status:400})}
  const awb=text(payload.awb)||text(payload.awb_code),shipmentId=text(payload.shipment_id),status=text(payload.current_status)||text(payload.shipment_status)||text(payload.status),eventIdentifier=text(payload.event_id)||text(payload.id);
  const payloadHash=createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  let event;try{event=await prisma.logisticsWebhookEvent.create({data:{provider:"SHIPROCKET",eventIdentifier,awb,shipmentId,statusText:status,payloadHash,payloadJson:payload as Prisma.InputJsonValue}})}catch{return NextResponse.json({success:true,duplicate:true})}
  try{const references=[...(awb?[{awbCode:awb},{trackingNumber:awb}]:[]),...(shipmentId?[{shiprocketShipmentId:shipmentId}]:[])];const order=references.length?await prisma.shopOrder.findFirst({where:{OR:references}}):null;if(!order||!status){await prisma.logisticsWebhookEvent.update({where:{id:event.id},data:{processingStatus:"IGNORED",processedAt:new Date(),failureReason:"No matching order or status."}});return NextResponse.json({success:true,accepted:true})}await applyTrackingUpdate(order.id,status,{statusCode:Number(payload.shipment_status_id)||undefined,eventAt:payload.scans_date?new Date(String(payload.scans_date)):undefined,webhook:true});await prisma.logisticsWebhookEvent.update({where:{id:event.id},data:{shopOrderId:order.id,processingStatus:"PROCESSED",processedAt:new Date()}})}catch(error){await prisma.logisticsWebhookEvent.update({where:{id:event.id},data:{processingStatus:"FAILED",processedAt:new Date(),failureReason:error instanceof Error?error.message.slice(0,500):"Processing failed."}})}
  return NextResponse.json({success:true,accepted:true});
}
