import type { CouponRow } from "./checkoutTypes";
import { formatMoney } from "./checkoutFormatters";

export function calculateCouponDiscount(coupon: CouponRow | null, subtotal: number) {
  if (!coupon || subtotal <= 0) return 0;

  const minOrderAmount = Number(coupon.min_order_amount || 0);
  if (subtotal < minOrderAmount) return 0;

  let discount = 0;

  if (coupon.discount_type === "fixed") {
    discount = Number(coupon.discount_value || 0);
  } else {
    discount = subtotal * (Number(coupon.discount_value || 0) / 100);
  }

  const maxDiscount = coupon.max_discount_amount;
  if (maxDiscount !== null && maxDiscount !== undefined && Number(maxDiscount) > 0) {
    discount = Math.min(discount, Number(maxDiscount));
  }

  discount = Math.min(discount, subtotal);
  return Math.max(0, Math.round(discount * 100) / 100);
}

export function getCouponLabel(coupon: CouponRow) {
  if (coupon.discount_type === "fixed") {
    return `${formatMoney(coupon.discount_value)} TL indirim`;
  }

  return `%${formatMoney(coupon.discount_value)} indirim`;
}
