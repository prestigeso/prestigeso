import type { OrderItem } from "@/types";

export type DisplayOrderItem = OrderItem & { discount_price?: number | string };
type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;

export function parseOrderItems(value: unknown): DisplayOrderItem[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? (parsed as DisplayOrderItem[]) : [];
  } catch {
    return [];
  }
}

export function getOrderItemsSubtotal(items: DisplayOrderItem[]) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 1);
    const price = Number(item.discount_price || item.price || 0);
    return Number.isFinite(quantity) && Number.isFinite(price)
      ? sum + price * quantity
      : sum;
  }, 0);
}

export function getOrderAddressLine(value: unknown): string {
  if (!value) return "Adres bilgisi yok.";
  if (typeof value === "string") return value;
  const address = asRecord(value);
  if (!address) return String(value);
  return String(
    address.fullAddress ||
      address.full_address ||
      address.address ||
      address.addressLine ||
      address.line ||
      "Açık adres yok.",
  );
}

export function getOrderCustomerName(value: unknown): string {
  const address = asRecord(value);
  if (!address) return "Belirtilmedi";
  return (
    [address.firstName, address.lastName]
      .filter(Boolean)
      .map(String)
      .join(" ") || "Belirtilmedi"
  );
}

export function getOrderLocationLine(value: unknown): string {
  const address = asRecord(value);
  if (!address) return "Belirtilmedi";
  return (
    [address.neighborhood, address.district, address.city]
      .filter(Boolean)
      .map(String)
      .join(" / ") || "Belirtilmedi"
  );
}

export function getOrderCouponInfo(value: unknown) {
  const address = asRecord(value);
  const coupon = asRecord(address?.coupon);
  if (!coupon) return null;
  const discountAmount = Number(coupon.discount_amount || 0);
  if (!Number.isFinite(discountAmount) || discountAmount <= 0) return null;
  return {
    id: coupon.id || null,
    code: String(coupon.code || "").toUpperCase(),
    discountType: coupon.discount_type || null,
    discountValue: Number(coupon.discount_value || 0),
    discountAmount,
    subtotalAmount: Number(coupon.subtotal_amount || 0),
    totalAfterDiscount: Number(coupon.total_after_discount || 0),
  };
}

export function formatOrderAddress(value: unknown): string {
  if (!value) return "Adres bilgisi yok.";
  let addressValue = value;
  if (typeof addressValue === "string") {
    const rawAddress = addressValue;
    try {
      addressValue = JSON.parse(addressValue);
    } catch {
      return rawAddress;
    }
  }
  const address = asRecord(addressValue);
  if (!address) return String(addressValue);
  return [
    getOrderCustomerName(address),
    address.phone,
    getOrderAddressLine(address),
    getOrderLocationLine(address),
  ]
    .filter(Boolean)
    .map(String)
    .join(" · ");
}
