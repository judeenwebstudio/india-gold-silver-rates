import type { ShopOrderStatus, ShopShipmentStatus } from "@/generated/prisma/enums";

export const ORDER_STATUSES:ShopOrderStatus[]=["PAYMENT_PENDING","PAYMENT_FAILED","PAYMENT_VERIFIED","ORDER_CONFIRMED","PROCESSING","PACKED","READY_TO_SHIP","SHIPPED","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","CANCEL_REQUESTED","CANCELLED","RETURN_REQUESTED","RETURNED","REFUND_PENDING","REFUNDED"];
export const SHIPMENT_STATUSES:ShopShipmentStatus[]=["NOT_CREATED","READY_TO_SHIP","PICKUP_SCHEDULED","SHIPPED","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","CANCELLED","RETURNED"];
const transitions:Record<ShopOrderStatus,ShopOrderStatus[]>={
  PAYMENT_PENDING:["PAYMENT_FAILED","PAYMENT_VERIFIED","CANCEL_REQUESTED","CANCELLED"],PAYMENT_FAILED:["PAYMENT_PENDING","CANCELLED"],
  PAYMENT_VERIFIED:["ORDER_CONFIRMED","CANCEL_REQUESTED","REFUND_PENDING"],ORDER_CONFIRMED:["PROCESSING","CANCEL_REQUESTED"],
  PROCESSING:["PACKED","CANCEL_REQUESTED"],PACKED:["READY_TO_SHIP","CANCEL_REQUESTED"],READY_TO_SHIP:["SHIPPED","CANCEL_REQUESTED"],
  SHIPPED:["IN_TRANSIT","CANCEL_REQUESTED","RETURN_REQUESTED"],IN_TRANSIT:["OUT_FOR_DELIVERY","RETURN_REQUESTED"],
  OUT_FOR_DELIVERY:["DELIVERED","RETURN_REQUESTED"],DELIVERED:["RETURN_REQUESTED"],CANCEL_REQUESTED:["CANCELLED","PROCESSING"],
  CANCELLED:["REFUND_PENDING"],RETURN_REQUESTED:["RETURNED"],RETURNED:["REFUND_PENDING","REFUNDED"],REFUND_PENDING:["REFUNDED"],REFUNDED:[],
};
export const canTransitionOrder=(from:ShopOrderStatus,to:ShopOrderStatus)=>transitions[from]?.includes(to)??false;
export const allowedNextStatuses=(status:ShopOrderStatus)=>transitions[status]??[];
export const publicStatusMessage=(status:ShopOrderStatus)=>({
  PAYMENT_PENDING:"Payment is awaiting confirmation.",PAYMENT_FAILED:"Payment could not be verified.",PAYMENT_VERIFIED:"Payment has been verified.",
  ORDER_CONFIRMED:"Your order is confirmed.",PROCESSING:"Your order is being prepared.",PACKED:"Your order has been packed.",READY_TO_SHIP:"Your order is ready to ship.",
  SHIPPED:"Your order has shipped.",IN_TRANSIT:"Your order is in transit.",OUT_FOR_DELIVERY:"Your order is out for delivery.",DELIVERED:"Your order was delivered.",
  CANCEL_REQUESTED:"Cancellation has been requested.",CANCELLED:"Your order was cancelled.",RETURN_REQUESTED:"A return has been requested.",RETURNED:"Your order was returned.",
  REFUND_PENDING:"Your refund is being processed.",REFUNDED:"Your refund is complete.",
})[status];
