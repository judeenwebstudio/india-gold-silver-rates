import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrderAdmin } from "@/lib/admin-orders";
import { getInvoicePdf, invoicePdfResponse, InvoicePdfError, InvoicePdfGenerationError } from "@/lib/invoice-pdf";

export const runtime = "nodejs";

const safe=(value:unknown)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export async function GET(request:Request,{params}:{params:Promise<{orderId:string}>}){
  try{
    await requireOrderAdmin("view");const {orderId}=await params;const url=new URL(request.url);const type=url.searchParams.get("type")==="packing-slip"?"packing-slip":"invoice";const download=url.searchParams.get("download")==="1";
    const order=await prisma.shopOrder.findUnique({where:{id:orderId},include:{user:true}});
    if(!order)return NextResponse.json({success:false,error:{message:"Order not found."}},{status:404});
    if(type==="invoice"){
      const invoice=await getInvoicePdf(orderId);
      return invoicePdfResponse(invoice,download);
    }
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>${safe(order.orderNumber)}</title><style>body{font:14px Arial;color:#292524;max-width:850px;margin:auto;padding:38px}.brand{background:#1c1917;color:#f5c96a;padding:24px;border-radius:14px}h1{margin:0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.card{border:1px solid #ddd;border-radius:12px;padding:16px;margin-top:20px}@media print{button{display:none}}</style></head><body><div class="brand"><h1>RateStack</h1><p>Packing Slip · ${safe(order.orderNumber)}</p></div><div class="grid"><div class="card"><h2>Customer</h2><p>${safe(order.customerName||order.user.fullName)}<br>${safe(order.customerEmail||order.user.email)}<br>${safe(order.customerPhone||order.user.phone)}</p></div><div class="card"><h2>Delivery</h2><p>${safe(order.addressLine1)} ${safe(order.addressLine2)}<br>${safe(order.deliveryCity)}, ${safe(order.deliveryDistrict)}<br>${safe(order.deliveryState)} ${safe(order.deliveryPincode)}</p></div></div><div class="card"><h2>Product</h2><p><b>${safe(order.productName)}</b><br>${safe(order.metalType)} · ${safe(order.purity)} · ${safe(order.weightGrams)}g × ${order.quantity}</p></div><button onclick="print()">Print packing slip</button></body></html>`;
    return new NextResponse(html,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Disposition":`${download?"attachment":"inline"}; filename="packing-slip-${order.orderNumber}.html"`,"Cache-Control":"private, no-store"}});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    const forbidden=message.startsWith("ADMIN_")||message==="CSRF_REJECTED";
    if(error instanceof InvoicePdfError)return NextResponse.json({success:false,error:{message:error.message}},{status:error.code==="NOT_FOUND"?404:409});
    if(!forbidden)console.error("invoice_pdf_failure",{route:"/api/v1/admin/orders/[orderId]/document",orderId:(await params).orderId,invoiceId:error instanceof InvoicePdfGenerationError?error.invoiceId:null,pdfStage:error instanceof InvoicePdfGenerationError?error.stage:"query",errorClass:error instanceof Error?error.name:"Unknown",errorMessage:message||"Unknown invoice error"});
    return NextResponse.json({success:false,error:{message:forbidden?"Admin authorization required.":"Unable to generate document."}},{status:forbidden?403:500});
  }
}
