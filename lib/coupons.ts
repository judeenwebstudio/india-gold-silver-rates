import "server-only";
import { prisma } from "@/lib/prisma";

export type CouponCart = { productId: string; metalType: "GOLD" | "SILVER"; subtotalPaise: bigint };
export type CouponValidation = { couponId: string; code: string; discountType: "FIXED" | "PERCENTAGE"; discountValue: number; discountAmountPaise: bigint; originalSubtotalPaise: bigint; finalSubtotalPaise: bigint };
export class CouponError extends Error { constructor(public code: string, message: string) { super(message); this.name = "CouponError"; } }
const reservationCutoff = () => new Date(Date.now() - 20 * 60_000);
const ids = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
export const normalizeCouponCode = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

export async function validateCoupon(codeInput: string, userId: string, cart: CouponCart): Promise<CouponValidation> {
  const code = normalizeCouponCode(codeInput);
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) throw new CouponError("INVALID_COUPON", "Invalid coupon");
  const now = new Date();
  if (!coupon.isEnabled) throw new CouponError("DISABLED_COUPON", "Disabled coupon");
  if (coupon.startsAt > now) throw new CouponError("COUPON_NOT_STARTED", "Coupon is not active yet");
  if (coupon.expiresAt <= now) throw new CouponError("EXPIRED_COUPON", "Expired coupon");
  if (cart.subtotalPaise < coupon.minimumPurchasePaise) throw new CouponError("MINIMUM_PURCHASE_NOT_REACHED", "Minimum purchase not reached");
  if (coupon.productScope === "GOLD_ONLY" && cart.metalType !== "GOLD" || coupon.productScope === "SILVER_ONLY" && cart.metalType !== "SILVER" || coupon.productScope === "SELECTED_PRODUCTS" && !ids(coupon.selectedProductIdsJson).includes(cart.productId)) throw new CouponError("PRODUCT_NOT_ELIGIBLE", "Product not eligible");
  const paidOrders = await prisma.shopOrder.count({ where: { userId, paymentStatus: "SUCCESS" } });
  if (coupon.customerScope === "NEW_CUSTOMERS" && paidOrders > 0 || coupon.customerScope === "EXISTING_CUSTOMERS" && paidOrders === 0 || coupon.customerScope === "SPECIFIC_USERS" && !ids(coupon.specificUserIdsJson).includes(userId)) throw new CouponError("CUSTOMER_NOT_ELIGIBLE", "Customer not eligible");
  const [customerUses, totalUses, activeReservations] = await Promise.all([
    prisma.couponRedemption.count({ where: { couponId: coupon.id, userId, status: "CONSUMED" } }),
    prisma.couponRedemption.count({ where: { couponId: coupon.id, status: "CONSUMED" } }),
    prisma.couponRedemption.count({ where: { couponId: coupon.id, status: "RESERVED", reservedAt: { gte: reservationCutoff() } } }),
  ]);
  if (customerUses >= coupon.perCustomerLimit) throw new CouponError("ALREADY_USED", "Already used");
  if (coupon.maximumTotalUses != null && totalUses + activeReservations >= coupon.maximumTotalUses) throw new CouponError("USAGE_LIMIT_REACHED", "Coupon usage limit reached");
  let discountAmountPaise = coupon.discountType === "FIXED" ? BigInt(coupon.discountValue) : cart.subtotalPaise * BigInt(coupon.discountValue) / 10_000n;
  if (coupon.maximumDiscountPaise != null && discountAmountPaise > coupon.maximumDiscountPaise) discountAmountPaise = coupon.maximumDiscountPaise;
  if (discountAmountPaise > cart.subtotalPaise) discountAmountPaise = cart.subtotalPaise;
  if (discountAmountPaise <= 0n) throw new CouponError("INVALID_DISCOUNT", "Coupon discount is unavailable");
  return { couponId: coupon.id, code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue, discountAmountPaise, originalSubtotalPaise: cart.subtotalPaise, finalSubtotalPaise: cart.subtotalPaise - discountAmountPaise };
}

export function couponAdjustedPrice(metalValuePaise: bigint, serviceChargePaise: bigint, shippingAmountPaise: bigint, gstBasisPoints: number, discountAmountPaise: bigint) {
  const originalSubtotalPaise = metalValuePaise + serviceChargePaise;
  const finalSubtotalPaise = originalSubtotalPaise - discountAmountPaise;
  const gstPaise = finalSubtotalPaise * BigInt(gstBasisPoints) / 10_000n;
  return { originalSubtotalPaise, finalSubtotalPaise, gstPaise, totalPaise: finalSubtotalPaise + gstPaise + shippingAmountPaise };
}

export async function consumeCouponForOrder(orderId: string) {
  await prisma.couponRedemption.updateMany({ where: { orderId, status: "RESERVED" }, data: { status: "CONSUMED", consumedAt: new Date() } });
}
