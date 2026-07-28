import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPhonePePaymentStatus } from '@/lib/schemes/phonepe';

export async function POST(request: Request) { return handle(request); }
export async function GET(request: Request) { return handle(request); }
async function handle(request: Request) {
  const orderNumber = new URL(request.url).searchParams.get('orderNumber');
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  if (!orderNumber) return NextResponse.redirect(`${site}/shop/orders?payment=failed`);
  const order = await prisma.shopOrder.findUnique({ where: { orderNumber } });
  if (!order) return NextResponse.redirect(`${site}/shop/orders?payment=failed`);
  if (order.paymentStatus !== 'SUCCESS') {
    const status = await checkPhonePePaymentStatus(order.gatewayOrderId || orderNumber);
    if (status.success) {
      await prisma.shopOrder.update({ where: { id: order.id }, data: {
        gatewayPaymentId: status.data?.transactionId || order.gatewayOrderId,
        paymentStatus: 'SUCCESS', orderStatus: 'CONFIRMED',
        invoiceNumber: `INV-${order.orderNumber}`, paidAt: new Date(),
      } });
    } else {
      return NextResponse.redirect(`${site}/shop/orders?payment=failed`);
    }
  }
  return NextResponse.redirect(`${site}/shop/orders?payment=success`);
}
