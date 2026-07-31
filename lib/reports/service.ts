import "server-only";
import { prisma } from "@/lib/prisma";
export const REPORT_MAX_DAYS=366;
export function reportRange(fromValue?:string,toValue?:string){
  const now=new Date(),to=toValue?new Date(`${toValue}T23:59:59.999+05:30`):now,from=fromValue?new Date(`${fromValue}T00:00:00+05:30`):new Date(now.getTime()-29*86400_000);
  if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime())||from>to)throw new Error("INVALID_DATE_RANGE");
  if(to.getTime()-from.getTime()>REPORT_MAX_DAYS*86400_000)throw new Error("REPORT_RANGE_TOO_LARGE");
  return {from,to};
}
const sum=(values:(bigint|null|undefined)[])=>values.reduce<bigint>((total,value)=>total+(value||0n),0n);
export function calculateReportRows(rows:Array<{paymentStatus:string;orderStatus:string;shipmentStatus:string;metalType:string;quantity:number;weightGrams:{toString():string};totalAmountPaise:bigint;metalValuePaise:bigint;serviceChargePaise:bigint;gstPaise:bigint;shippingAmountPaise:bigint;discountAmountPaise:bigint;productCostPaise:bigint|null;metalAcquisitionCostPaise:bigint|null;packagingCostPaise:bigint|null;shippingCostPaise:bigint|null;gatewayFeePaise:bigint|null;otherCostPaise:bigint|null;costSnapshotComplete:boolean;refunds:{amountPaise:bigint;status:string}[]}>){
  const paid=rows.filter(x=>x.paymentStatus==="SUCCESS"),refunds=paid.flatMap(x=>x.refunds.filter(r=>["PARTIALLY_REFUNDED","FULLY_REFUNDED"].includes(r.status)).map(r=>r.amountPaise));
  const grossSales=sum(paid.map(x=>x.totalAmountPaise)),refundAmount=sum(refunds),netSales=grossSales-refundAmount,gst=sum(paid.map(x=>x.gstPaise)),discounts=sum(paid.map(x=>x.discountAmountPaise));
  const costs=sum(paid.flatMap(x=>[x.productCostPaise,x.metalAcquisitionCostPaise,x.packagingCostPaise,x.shippingCostPaise,x.gatewayFeePaise,x.otherCostPaise]));
  const metal=(kind:string)=>{const selected=paid.filter(x=>x.metalType===kind);return {orders:selected.length,units:selected.reduce((n,x)=>n+x.quantity,0),grams:selected.reduce((n,x)=>n+Number(x.weightGrams.toString())*x.quantity,0),revenuePaise:sum(selected.map(x=>x.totalAmountPaise)),gstPaise:sum(selected.map(x=>x.gstPaise))}};
  const shipped=rows.filter(x=>x.shipmentStatus!=="NOT_CREATED"),delivered=shipped.filter(x=>x.shipmentStatus==="DELIVERED").length,rto=shipped.filter(x=>x.shipmentStatus==="RETURNED").length;
  return {totalOrders:rows.length,paidOrders:paid.length,cancelledOrders:rows.filter(x=>x.orderStatus==="CANCELLED").length,deliveredOrders:delivered,grossSalesPaise:grossSales,netSalesPaise:netSales,gstPaise:gst,refundsPaise:refundAmount,discountsPaise:discounts,estimatedProfitPaise:netSales-costs,missingCostWarning:paid.some(x=>!x.costSnapshotComplete),averageOrderValuePaise:paid.length?grossSales/BigInt(paid.length):0n,gold:metal("GOLD"),silver:metal("SILVER"),rtoCount:rto,deliverySuccessRate:shipped.length?delivered/shipped.length*100:0,rtoRate:shipped.length?rto/shipped.length*100:0};
}
export async function getAdminReport(from:Date,to:Date){
  const rows=await prisma.shopOrder.findMany({where:{createdAt:{gte:from,lte:to}},select:{paymentStatus:true,orderStatus:true,shipmentStatus:true,metalType:true,quantity:true,weightGrams:true,totalAmountPaise:true,metalValuePaise:true,serviceChargePaise:true,gstPaise:true,shippingAmountPaise:true,discountAmountPaise:true,productCostPaise:true,metalAcquisitionCostPaise:true,packagingCostPaise:true,shippingCostPaise:true,gatewayFeePaise:true,otherCostPaise:true,costSnapshotComplete:true,refunds:{select:{amountPaise:true,status:true}}},take:10000,orderBy:{createdAt:"desc"}});
  return calculateReportRows(rows);
}
export const inr=(paise:bigint)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(Number(paise)/100);
