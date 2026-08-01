"use client";

import { useEffect, useState } from "react";

type CouponAnnouncement = { code: string; message: string; bannerColor?: string | null; icon?: string | null };

export function CouponBanner() {
  const [coupons, setCoupons] = useState<CouponAnnouncement[]>([]);
  useEffect(() => {
    fetch("/api/v1/coupons/active", { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => setCoupons(Array.isArray(body.data) ? body.data : []))
      .catch(() => setCoupons([]));
  }, []);
  if (!coupons.length) return null;
  const items = [...coupons, ...coupons];
  return <section aria-label="Active coupon offers" className="coupon-banner overflow-hidden bg-stone-950 py-2.5 text-amber-100"><div className="coupon-banner-track flex w-max gap-12 whitespace-nowrap px-6">{items.map((coupon,index)=><span key={`${coupon.code}-${index}`} className="font-semibold"><span aria-hidden>{coupon.icon || "🎉"}</span> {coupon.message}</span>)}</div></section>;
}
