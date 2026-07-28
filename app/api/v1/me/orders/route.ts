import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';

export async function GET(request: Request) {
  const authUser = await authenticateSchemeUserFromRequest(request);
  if (!authUser) return NextResponse.json({ success: false, error: { message: 'Authentication required.' } }, { status: 401 });
  const orders = await prisma.shopOrder.findMany({ where: { userId: authUser.userId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ success: true, data: orders.map((order) => ({
    id: order.id, orderNumber: order.orderNumber, product: order.productName,
    weightGrams: Number(order.weightGrams), quantity: order.quantity,
    rateUsed: Number(order.trichyRatePerGramPaise) / 100,
    metalValue: Number(order.metalValuePaise) / 100,
    serviceCharge: Number(order.serviceChargePaise) / 100,
    gst: Number(order.gstPaise) / 100,
    shippingAmount: Number(order.shippingAmountPaise) / 100,
    total: Number(order.totalAmountPaise) / 100,
    gateway: order.gateway, transactionId: order.gatewayPaymentId,
    paymentStatus: order.paymentStatus, orderStatus: order.orderStatus,
    invoiceNumber: order.invoiceNumber, createdAt: order.createdAt,
  })) });
}
