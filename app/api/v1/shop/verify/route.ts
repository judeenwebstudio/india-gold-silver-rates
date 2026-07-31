import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { verifyRazorpaySignature } from '@/lib/schemes/razorpay';
import { z } from 'zod';
import { enqueueOrderEvent } from '@/lib/notifications/outbox';

const schema = z.object({ shopOrderId: z.string(), gatewayPaymentId: z.string(), gatewaySignature: z.string() });
export async function POST(request: Request) {
  const authUser = await authenticateSchemeUserFromRequest(request);
  if (!authUser) return NextResponse.json({ success: false, error: { message: 'Authentication required.' } }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: 'Invalid verification data.' } }, { status: 400 });
  const order = await prisma.shopOrder.findUnique({ where: { id: parsed.data.shopOrderId } });
  if (!order || order.userId !== authUser.userId) return NextResponse.json({ success: false, error: { message: 'Order not found.' } }, { status: 404 });
  if (order.paymentStatus === 'SUCCESS') return NextResponse.json({ success: true, data: { orderNumber: order.orderNumber, invoiceNumber: order.invoiceNumber } });
  if (order.gateway !== 'RAZORPAY' || !order.gatewayOrderId || !verifyRazorpaySignature(order.gatewayOrderId, parsed.data.gatewayPaymentId, parsed.data.gatewaySignature)) {
    return NextResponse.json({ success: false, error: { message: 'Payment verification failed.' } }, { status: 400 });
  }
  const invoiceNumber = `INV-${order.orderNumber}`;
  const product=await prisma.shopProduct.findUnique({where:{id:order.productId}});
  const gatewayFeePaise=product?.gatewayFeeBasisPoints==null?null:(order.totalAmountPaise*BigInt(product.gatewayFeeBasisPoints)+5000n)/10000n;
  await prisma.shopOrder.update({ where: { id: order.id }, data: {
    gatewayPaymentId: parsed.data.gatewayPaymentId, gatewaySignature: parsed.data.gatewaySignature,
    paymentStatus: 'SUCCESS', orderStatus: 'PAYMENT_VERIFIED', invoiceNumber, paidAt: new Date(),
    productCostPaise:product?.productCostPaise,metalAcquisitionCostPaise:product?.metalAcquisitionCostPaise,
    packagingCostPaise:product?.packagingCostPaise,shippingCostPaise:product?.shippingCostPaise,
    gatewayFeePaise,otherCostPaise:product?.otherCostPaise,
    costSnapshotComplete:Boolean(product&&product.productCostPaise!=null&&product.metalAcquisitionCostPaise!=null&&product.packagingCostPaise!=null&&product.shippingCostPaise!=null&&gatewayFeePaise!=null&&product.otherCostPaise!=null),
  } });
  await enqueueOrderEvent(order.id,"PAYMENT_VERIFIED");
  return NextResponse.json({ success: true, data: { orderNumber: order.orderNumber, invoiceNumber } });
}
