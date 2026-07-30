"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrderAdmin } from "@/lib/admin-orders";
import { assignAwb, cancelShiprocketShipment, checkServiceability, createShiprocketShipment, generateDocument, refreshTracking, schedulePickup, submitNdrAction } from "@/lib/shiprocket/service";
import { prisma } from "@/lib/prisma";
const id=z.string().cuid(),value=(data:FormData,key:string)=>String(data.get(key)||"").trim();
const redirectError=(error:unknown)=>error instanceof Error&&"digest" in error&&typeof error.digest==="string"&&error.digest.startsWith("NEXT_REDIRECT");
const finish=(orderId:string,message:string,error=false)=>{revalidatePath(`/admin/orders/${orderId}`);redirect(`/admin/orders/${orderId}?${error?"error":"notice"}=${encodeURIComponent(message)}`)};
async function run(data:FormData,task:(orderId:string,admin:Awaited<ReturnType<typeof requireOrderAdmin>>)=>Promise<unknown>){const orderId=id.parse(data.get("orderId"));try{const admin=await requireOrderAdmin("shiprocket");await task(orderId,admin);finish(orderId,"Shiprocket operation completed.")}catch(error){if(redirectError(error))throw error;finish(orderId,error instanceof Error?error.message:"Shiprocket operation failed.",true)}}
export async function createShiprocketAction(data:FormData){return run(data,createShiprocketShipment)}
export async function checkServiceabilityAction(data:FormData){return run(data,async(orderId,admin)=>{const couriers=await checkServiceability(orderId);await prisma.systemSetting.upsert({where:{key:`SHIPROCKET_COURIERS_${orderId}`},create:{key:`SHIPROCKET_COURIERS_${orderId}`,value:JSON.stringify(couriers)},update:{value:JSON.stringify(couriers)}});await prisma.adminAuditLog.create({data:{adminUserId:admin.id,action:"SHIPROCKET_SERVICEABILITY_CHECKED",targetEntity:"ShopOrder",targetId:orderId,detailsJson:{courierCount:couriers.length},ipAddress:admin.ipAddress}})})}
export async function assignAwbAction(data:FormData){return run(data,(orderId,admin)=>assignAwb(orderId,value(data,"courierId")||undefined,admin))}
export async function schedulePickupAction(data:FormData){return run(data,(orderId,admin)=>schedulePickup(orderId,value(data,"pickupDate")||undefined,admin))}
export async function generateShiprocketDocumentAction(data:FormData){return run(data,(orderId,admin)=>generateDocument(orderId,z.enum(["LABEL","MANIFEST","INVOICE"]).parse(data.get("type")),admin))}
export async function refreshShiprocketTrackingAction(data:FormData){return run(data,async orderId=>{await refreshTracking(orderId)})}
export async function cancelShiprocketAction(data:FormData){return run(data,cancelShiprocketShipment)}
export async function ndrShiprocketAction(data:FormData){return run(data,(orderId,admin)=>submitNdrAction(orderId,z.enum(["REATTEMPT","RTO"]).parse(data.get("action")),value(data,"comments"),admin))}
