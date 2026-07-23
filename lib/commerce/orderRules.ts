export type CartQuantityInput = {
  id?: unknown;
  variant_id?: unknown;
  quantity?: unknown;
};

export type AggregatedCartLine = {
  productId: number;
  variantId: number | null;
  quantity: number;
};

export function aggregateCartLines(
  items: CartQuantityInput[],
  maxPerLine = 99,
) {
  const lines = new Map<string, AggregatedCartLine>();
  for (const item of items) {
    const productId = Number(item?.id);
    const rawVariantId = item?.variant_id;
    const variantId = rawVariantId == null ? null : Number(rawVariantId);
    const quantity = Number(item?.quantity);
    if (!Number.isSafeInteger(productId) || productId <= 0)
      throw new Error("INVALID_PRODUCT_ID");
    if (variantId !== null && (!Number.isSafeInteger(variantId) || variantId <= 0))
      throw new Error("INVALID_VARIANT_ID");
    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > maxPerLine)
      throw new Error("INVALID_QUANTITY");
    const key = `${productId}:${variantId || 0}`;
    const total = (lines.get(key)?.quantity || 0) + quantity;
    if (total > maxPerLine) throw new Error("MAX_QUANTITY_EXCEEDED");
    lines.set(key, { productId, variantId, quantity: total });
  }
  if (lines.size === 0) throw new Error("EMPTY_CART");
  return [...lines.values()];
}

export function aggregateCartQuantities(
  items: CartQuantityInput[],
  maxPerProduct = 99,
) {
  const quantities = new Map<number, number>();
  for (const line of aggregateCartLines(items, maxPerProduct)) {
    const total = (quantities.get(line.productId) || 0) + line.quantity;
    if (total > maxPerProduct) throw new Error("MAX_QUANTITY_EXCEEDED");
    quantities.set(line.productId, total);
  }
  if (quantities.size === 0) throw new Error("EMPTY_CART");
  return quantities;
}

export function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateDiscount({
  subtotal,
  type,
  value,
  maxDiscount,
}: {
  subtotal: number;
  type: "percent" | "fixed";
  value: number;
  maxDiscount?: number | null;
}) {
  if (
    !Number.isFinite(subtotal) ||
    subtotal <= 0 ||
    !Number.isFinite(value) ||
    value <= 0
  )
    return 0;
  let discount = type === "fixed" ? value : subtotal * (value / 100);
  if (maxDiscount && maxDiscount > 0)
    discount = Math.min(discount, maxDiscount);
  return roundMoney(Math.max(0, Math.min(discount, subtotal)));
}

export function calculateShipping({
  enabled,
  fee,
  threshold,
  subtotal,
}: {
  enabled: boolean;
  fee: number;
  threshold: number;
  subtotal: number;
}) {
  if (!enabled || fee <= 0 || (threshold > 0 && subtotal >= threshold))
    return 0;
  return roundMoney(fee);
}
