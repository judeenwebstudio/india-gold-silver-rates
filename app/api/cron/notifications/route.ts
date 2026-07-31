import { NextResponse } from "next/server";
import { isValidCronAuthorization } from "@/lib/scheduler/cron-auth";
import { processNotificationBatch } from "@/lib/notifications/worker";
export const dynamic="force-dynamic";export const runtime="nodejs";export const maxDuration=300;
export async function POST(request:Request){if(!isValidCronAuthorization(request.headers.get("authorization"),process.env.CRON_SECRET))return NextResponse.json({success:false,error:{message:"Unauthorized."}},{status:401});return NextResponse.json({success:true,data:await processNotificationBatch(25)})}
export const GET=POST;
