import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { getActivePaymentGateway } from '@/lib/schemes/gateway';
import { createRazorpayOrder } from '@/lib/schemes/razorpay';
import { createPhonePeOrder } from '@/lib/schemes/phonepe';
import { calculateShopPrice, getTrichyShopRates, validateShopWeight } from '@/lib/shop';
import { z } from 'zod';

const schema = z.object({ productId: z.string().min(1), weightGrams: z.number().positive(), quantity: z.number().int().min(1).max(10) });

export async function POST(request: Request) {
  const authUser = await authenticateSchemeUserFromRequest(request);
  if (!authUser) return NextResponse.json({ success: false, error: { message: 'Authentication required.' } }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: 'Invalid product selection.' } }, { status: 400 });
  const product = await prisma.shopProduct.findUnique({ where: { id: parsed.data.productId } });
  if (!product?.isActive) return NextResponse.json({ success: false, error: { message: 'Product is unavailable.' } }, { status: 404 });
  const weights = product.availableWeightsGramsJson as number[];
  const weightError = validateShopWeight(product.metalType, weights, parsed.data.weightGrams);
  if (weightError) return NextResponse.json({ success: false, error: weightError }, { status: 400 });
  const [rates, gateway] = await Promise.all([getTrichyShopRates(), getActivePaymentGateway()]);
  const rate = product.metalType === 'GOLD' ? rates.gold22kPerGramPaise : rates.silver999PerGramPaise;
  const price = calculateShopPrice(rate, parsed.data.weightGrams, parsed.data.quantity, product.serviceChargeBasisPoints, product.gstBasisPoints);
  const orderNumber = `SHOP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  let gatewayOrderId = '';
  let redirectUrl: string | undefined;
  if (gateway === 'RAZORPAY') {
    gatewayOrderId = (await createRazorpayOrder({ orderId: orderNumber, amountPaise: price.totalPaise, receiptNumber: orderNumber })).gatewayOrderId;
  } else {
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const phonepe = await createPhonePeOrder({
      orderId: orderNumber, amountPaise: price.totalPaise, receiptNumber: orderNumber,
      userId: authUser.userId, mobileNumber: authUser.phone, enrollmentId: 'SHOP',
      redirectUrl: `${site}/api/v1/shop/phonepe-return?orderNumber=${encodeURIComponent(orderNumber)}`,
      callbackUrl: `${site}/api/v1/shop/phonepe-return?orderNumber=${encodeURIComponent(orderNumber)}`,
    });
    gatewayOrderId = phonepe.gatewayOrderId;
    redirectUrl = phonepe.redirectUrl;
  }
  const order = await prisma.shopOrder.create({
    data: {
      orderNumber, userId: authUser.userId, productId: product.id, productName: product.name,
      metalType: product.metalType, purity: product.purity, weightGrams: parsed.data.weightGrams,
      quantity: parsed.data.quantity, trichyRatePerGramPaise: rate, metalValuePaise: price.metalValuePaise,
      serviceChargeBasisPoints: product.serviceChargeBasisPoints, serviceChargePaise: price.serviceChargePaise,
      gstBasisPoints: product.gstBasisPoints, gstPaise: price.gstPaise,
      shippingAmountPaise: price.shippingAmountPaise, totalAmountPaise: price.totalPaise,
      gateway, gatewayOrderId, paymentStatus: 'PENDING',
    },
  });
  return NextResponse.json({ success: true, data: {
    shopOrderId: order.id, orderNumber, gateway, gatewayOrderId, redirectUrl,
    keyId: gateway === 'RAZORPAY' ? process.env.RAZORPAY_KEY_ID : undefined,
    amount: Number(price.totalPaise) / 100, currency: 'INR',
    pricing: {
      metalValue: Number(price.metalValuePaise) / 100,
      serviceChargeAmount: Number(price.serviceChargePaise) / 100,
      gstAmount: Number(price.gstPaise) / 100,
      shippingAmount: Number(price.shippingAmountPaise) / 100,
      totalAmount: Number(price.totalPaise) / 100,
    },
  } });
}
