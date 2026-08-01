export type CouponArithmetic = { discountType: "FIXED" | "PERCENTAGE"; discountValue: number; maximumDiscountPaise?: bigint | null };

export function calculateCouponDiscount(subtotalPaise: bigint, coupon: CouponArithmetic) {
  let discount = coupon.discountType === "FIXED" ? BigInt(coupon.discountValue) : subtotalPaise * BigInt(coupon.discountValue) / 10_000n;
  if (coupon.maximumDiscountPaise != null && discount > coupon.maximumDiscountPaise) discount = coupon.maximumDiscountPaise;
  return discount > subtotalPaise ? subtotalPaise : discount;
}

export function calculateCouponTotals(metalValuePaise: bigint, serviceChargePaise: bigint, shippingPaise: bigint, gstBasisPoints: number, discountPaise: bigint) {
  const originalSubtotalPaise = metalValuePaise + serviceChargePaise;
  const finalSubtotalPaise = originalSubtotalPaise - discountPaise;
  const gstPaise = finalSubtotalPaise * BigInt(gstBasisPoints) / 10_000n;
  return { originalSubtotalPaise, finalSubtotalPaise, gstPaise, totalPaise: finalSubtotalPaise + gstPaise + shippingPaise };
}
