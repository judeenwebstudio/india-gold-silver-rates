import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSchemeUserFromRequest } from '@/lib/schemes/user-auth';
import { getActivePaymentGateway } from '@/lib/schemes/gateway';
import { createRazorpayOrder } from '@/lib/schemes/razorpay';
import { createPhonePeOrder } from '@/lib/schemes/phonepe';
import { calculateShopPrice, getTrichyShopRates, validateShopWeight } from '@/lib/shop';
import { z } from 'zod';
import { optionalGstSchema } from '@/lib/gst';

const schema = z.object({
  productId: z.string().min(1), weightGrams: z.number().positive(), quantity: z.number().int().min(1).max(10),
  gateway: z.enum(['RAZORPAY', 'PHONEPE']), idempotencyKey: z.string().min(12).max(100),
  customer: z.object({
    fullName: z.string().trim().min(2).max(100),
    mobile: z.string().trim().regex(/^(?:\+91)?[6-9]\d{9}$/, 'Enter a valid Indian mobile number.'),
    email: z.string().trim().email(),
  }),
  addressId: z.string().min(1).optional(),
  newAddress: z.object({
    fullName: z.string().trim().min(2).max(100),
    mobile: z.string().trim().regex(/^(?:\+91)?[6-9]\d{9}$/),
    addressLine1: z.string().trim().min(3).max(200), addressLine2: z.string().trim().max(200).optional().default(''),
    landmark: z.string().trim().max(120).optional().default(''), city: z.string().trim().min(2).max(100),
    district: z.string().trim().min(2).max(100), state: z.string().trim().min(2).max(100),
    pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a valid six-digit Indian PIN code.'), country: z.literal('India'), addressType: z.enum(['HOME', 'OFFICE', 'OTHER']),
  }).optional(),
  gst: optionalGstSchema.optional().default({ enabled: false }),
}).refine((value) => Boolean(value.addressId) !== Boolean(value.newAddress), { message: 'Select one valid delivery address.' });

export async function POST(request: Request) {
  const authUser = await authenticateSchemeUserFromRequest(request);
  if (!authUser) return NextResponse.json({ success: false, error: { message: 'Authentication required.' } }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: { code: 'INVALID_CHECKOUT_DETAILS', message: parsed.error.issues[0]?.message || 'Invalid checkout details.' } }, { status: 400 });
  const existing = await prisma.shopOrder.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey } });
  if (existing && existing.userId !== authUser.userId) return NextResponse.json({ success: false, error: { message: 'Invalid checkout request.' } }, { status: 409 });
  if (existing?.gatewayOrderId) return shopOrderResponse(existing);
  const selectedAddress = parsed.data.addressId
    ? await prisma.deliveryAddress.findFirst({ where: { id: parsed.data.addressId, userId: authUser.userId } })
    : parsed.data.newAddress;
  if (!selectedAddress) return NextResponse.json({ success: false, error: { code: 'ADDRESS_NOT_FOUND', message: 'Select a valid delivery address.' } }, { status: 400 });
  const product = await prisma.shopProduct.findUnique({ where: { id: parsed.data.productId } });
  if (!product?.isActive) return NextResponse.json({ success: false, error: { message: 'Product is unavailable.' } }, { status: 404 });
  const weights = product.availableWeightsGramsJson as number[];
  const weightError = validateShopWeight(product.metalType, weights, parsed.data.weightGrams);
  if (weightError) return NextResponse.json({ success: false, error: weightError }, { status: 400 });
  const [rates, gateway] = await Promise.all([getTrichyShopRates(), getActivePaymentGateway()]);
  if (gateway !== parsed.data.gateway) return NextResponse.json({ success: false, error: { message: `${parsed.data.gateway} is not currently enabled.` } }, { status: 400 });
  const rate = product.metalType === 'GOLD' ? rates.gold22kPerGramPaise : rates.silver999PerGramPaise;
  const rateSource = product.metalType === 'GOLD' ? rates.goldSource : rates.silverSource;
  const rawRateDate = product.metalType === 'GOLD' ? rates.goldRateDate : rates.silverRateDate;
  const parsedRateDate = rawRateDate ? new Date(rawRateDate) : null;
  const price = calculateShopPrice(rate, parsed.data.weightGrams, parsed.data.quantity, product.serviceChargeBasisPoints, product.gstBasisPoints);
  const orderNumber = existing?.orderNumber || `SHOP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const order = existing || await prisma.shopOrder.create({
    data: {
      orderNumber, idempotencyKey: parsed.data.idempotencyKey, userId: authUser.userId, productId: product.id, productName: product.name,
      metalType: product.metalType, purity: product.purity, weightGrams: parsed.data.weightGrams, quantity: parsed.data.quantity,
      trichyRatePerGramPaise: rate, rateSource, rateDate: parsedRateDate && !Number.isNaN(parsedRateDate.getTime()) ? parsedRateDate : null,
      metalValuePaise: price.metalValuePaise, serviceChargeBasisPoints: product.serviceChargeBasisPoints,
      serviceChargePaise: price.serviceChargePaise, gstBasisPoints: product.gstBasisPoints, gstPaise: price.gstPaise,
      shippingAmountPaise: price.shippingAmountPaise, totalAmountPaise: price.totalPaise,
      customerName: parsed.data.customer.fullName, customerPhone: parsed.data.customer.mobile, customerEmail: parsed.data.customer.email,
      addressLine1: selectedAddress.addressLine1, addressLine2: selectedAddress.addressLine2 || null,
      landmark: selectedAddress.landmark || null, deliveryCity: selectedAddress.city,
      deliveryDistrict: selectedAddress.district, deliveryState: selectedAddress.state,
      deliveryPincode: selectedAddress.pincode, deliveryCountry: selectedAddress.country, addressType: selectedAddress.addressType,
      gateway, paymentStatus: 'PENDING', orderStatus: 'PAYMENT_PENDING',
      gstInvoiceRequested: parsed.data.gst.enabled,
      gstBusinessName: parsed.data.gst.enabled ? parsed.data.gst.businessName : null,
      gstNumber: parsed.data.gst.enabled ? parsed.data.gst.gstNumber : null,
      gstBillingAddress: parsed.data.gst.enabled ? parsed.data.gst.billingAddress : null,
    },
  });
  if(parsed.data.gst.enabled){
    const current=await prisma.customerGSTProfile.findFirst({where:{customerId:authUser.userId,isDefault:true}});
    const profileData={businessName:parsed.data.gst.businessName,gstNumber:parsed.data.gst.gstNumber,billingAddress:parsed.data.gst.billingAddress,isActive:true,isDefault:true};
    const profile=current?await prisma.customerGSTProfile.update({where:{id:current.id},data:profileData}):await prisma.customerGSTProfile.create({data:{customerId:authUser.userId,...profileData}});
    await prisma.auditLog.create({data:{actorType:"CUSTOMER",actorId:authUser.userId,action:"GST_PROFILE_SAVED_DURING_CHECKOUT",targetEntity:"CustomerGSTProfile",targetId:profile.id,detailsJson:{gstLastFour:profile.gstNumber.slice(-4)}}});
  }
  let gatewayOrderId = '';
  let redirectUrl: string | undefined;
  try {
    if (gateway === 'RAZORPAY') {
      gatewayOrderId = (await createRazorpayOrder({ orderId: orderNumber, amountPaise: order.totalAmountPaise, receiptNumber: orderNumber })).gatewayOrderId;
    } else {
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const phonepe = await createPhonePeOrder({
      orderId: orderNumber, amountPaise: order.totalAmountPaise, receiptNumber: orderNumber,
      userId: authUser.userId, mobileNumber: parsed.data.customer.mobile, enrollmentId: 'SHOP',
      redirectUrl: `${site}/api/v1/shop/phonepe-return?orderNumber=${encodeURIComponent(orderNumber)}`,
      callbackUrl: `${site}/api/v1/shop/phonepe-return?orderNumber=${encodeURIComponent(orderNumber)}`,
    });
    gatewayOrderId = phonepe.gatewayOrderId;
    redirectUrl = phonepe.redirectUrl;
    }
  } catch (error) {
    await prisma.shopOrder.update({ where: { id: order.id }, data: { failureMessage: error instanceof Error ? error.message.slice(0, 250) : 'Gateway initiation failed' } });
    return NextResponse.json({ success: false, error: { code: 'PAYMENT_INITIATION_FAILED', message: 'Order saved. Payment could not be started; please retry.' }, data: { shopOrderId: order.id, orderNumber } }, { status: 502 });
  }
  const updated = await prisma.shopOrder.update({ where: { id: order.id }, data: { gatewayOrderId } });
  return shopOrderResponse(updated, redirectUrl);
}

function shopOrderResponse(order: { id: string; orderNumber: string; gateway: string; gatewayOrderId: string | null; metalValuePaise: bigint; serviceChargePaise: bigint; gstPaise: bigint; shippingAmountPaise: bigint; totalAmountPaise: bigint; currency: string }, redirectUrl?: string) {
  return NextResponse.json({ success: true, data: {
    shopOrderId: order.id, orderNumber: order.orderNumber, gateway: order.gateway, gatewayOrderId: order.gatewayOrderId, redirectUrl,
    keyId: order.gateway === 'RAZORPAY' ? process.env.RAZORPAY_KEY_ID : undefined,
    amount: Number(order.totalAmountPaise) / 100, currency: order.currency,
    pricing: {
      metalValue: Number(order.metalValuePaise) / 100,
      serviceChargeAmount: Number(order.serviceChargePaise) / 100,
      gstAmount: Number(order.gstPaise) / 100,
      shippingAmount: Number(order.shippingAmountPaise) / 100,
      totalAmount: Number(order.totalAmountPaise) / 100,
    },
  } });
}
