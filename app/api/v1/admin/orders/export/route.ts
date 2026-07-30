import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrderAdmin } from "@/lib/admin-orders";

const csv=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
const maskEmail=(value:string|null)=>value?value.replace(/^(.{2}).*(@.*)$/,"$1***$2"):"";
const maskPhone=(value:string|null)=>value?`${value.slice(0,2)}******${value.slice(-2)}`:"";
export async function GET(request:Request){
  try{
    await requireOrderAdmin("export");const url=new URL(request.url),q=url.searchParams;
    const where={...(q.get("payment")?{paymentStatus:q.get("payment")!}:{}),...(q.get("status")?{orderStatus:q.get("status") as never}:{}),...(q.get("shipment")?{shipmentStatus:q.get("shipment") as never}:{}),...(q.get("product")?{metalType:q.get("product") as "GOLD"|"SILVER"}:{}),...(q.get("from")||q.get("to")?{createdAt:{...(q.get("from")?{gte:new Date(`${q.get("from")}T00:00:00+05:30`)}:{}),...(q.get("to")?{lte:new Date(`${q.get("to")}T23:59:59+05:30`)}:{})}}:{})};
    const rows=await prisma.shopOrder.findMany({where,orderBy:{createdAt:"desc"},take:10_000});
    const header=["Order ID","Customer","Email (masked)","Mobile (masked)","Product","Purity","Weight","Quantity","Total INR","Gateway","Payment Status","Order Status","Shipment Status","City","Courier","AWB","Created"];
    const lines=[header.map(csv).join(","),...rows.map(o=>[o.orderNumber,o.customerName,maskEmail(o.customerEmail),maskPhone(o.customerPhone),o.productName,o.purity,o.weightGrams,o.quantity,Number(o.totalAmountPaise)/100,o.gateway,o.paymentStatus,o.orderStatus,o.shipmentStatus,o.deliveryCity,o.courierPartner,o.trackingNumber,o.createdAt.toISOString()].map(csv).join(","))];
    return new NextResponse(lines.join("\r\n"),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="ratestack-orders-${new Date().toISOString().slice(0,10)}.csv"`,"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({success:false,error:{message:"Admin authorization required."}},{status:403});}
}
