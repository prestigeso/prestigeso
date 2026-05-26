import type { ShippingSettings } from "./checkoutTypes";

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  shipping_fee: 0,
  free_shipping_threshold: 0,
  shipping_enabled: true,
};

export function normalizeShippingSettings(value: any): ShippingSettings {
  const shippingFee = Number(value?.shipping_fee || 0);
  const freeShippingThreshold = Number(value?.free_shipping_threshold || 0);

  return {
    shipping_fee: Number.isFinite(shippingFee) && shippingFee > 0 ? shippingFee : 0,
    free_shipping_threshold:
      Number.isFinite(freeShippingThreshold) && freeShippingThreshold > 0
        ? freeShippingThreshold
        : 0,
    shipping_enabled: value?.shipping_enabled !== false,
  };
}

export function calculateShippingFee(
  settings: ShippingSettings,
  subtotalAfterCoupon: number
) {
  if (!settings.shipping_enabled) return 0;

  const threshold = Number(settings.free_shipping_threshold || 0);
  const fee = Number(settings.shipping_fee || 0);

  if (threshold > 0 && subtotalAfterCoupon >= threshold) return 0;
  return fee > 0 ? fee : 0;
}

export function calculateRemainingForFreeShipping(
  settings: ShippingSettings,
  subtotalAfterCoupon: number,
  shippingFee: number
) {
  if (!settings.shipping_enabled) return 0;
  if (!settings.free_shipping_threshold) return 0;
  if (shippingFee <= 0) return 0;

  return Math.max(0, settings.free_shipping_threshold - subtotalAfterCoupon);
}
