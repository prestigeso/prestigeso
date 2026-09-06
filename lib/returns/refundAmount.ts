type Item = Record<string, unknown>;

function numeric(value: unknown): number {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim()))
    return Number.NaN;
  return Number(value);
}

function parseItems(value: unknown): Item[] {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error("İade satırları okunamadı.");
    }
  }
  if (!Array.isArray(value) || !value.length || value.length > 100)
    throw new Error("İade satırları geçersiz.");
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw new Error("İade satırı geçersiz.");
    return item as Item;
  });
}

function identity(item: Item): string {
  const id = numeric(item.id);
  const variantId = item.variant_id == null ? 0 : numeric(item.variant_id);
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(variantId) || variantId < 0)
    throw new Error("İade ürün veya varyant kimliği geçersiz.");
  return `${id}:${variantId}`;
}

function quantity(item: Item): number {
  const value = numeric(item.quantity);
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error("İade adedi pozitif tam sayı olmalıdır.");
  return value;
}

/** Use the saved order prices, not return-request prices or the current catalogue. */
export function calculateReturnRefundAmount({
  orderItems,
  returnItems,
  totalAmount,
}: {
  orderItems: unknown;
  returnItems: unknown;
  totalAmount: unknown;
}): number {
  const paidCents = Math.round(numeric(totalAmount) * 100);
  if (!Number.isSafeInteger(paidCents) || paidCents <= 0)
    throw new Error("Sipariş ödeme tutarı geçersiz.");

  const originals = new Map<string, { quantity: number; priceCents: number }>();
  let fullSubtotal = 0;
  for (const item of parseItems(orderItems)) {
    const key = identity(item);
    if (originals.has(key)) throw new Error("Sipariş aynı ürün ve varyant için tekrarlı satır içeriyor.");
    const count = quantity(item);
    const priceCents = Math.round(numeric(item.price || item.discount_price) * 100);
    if (!Number.isSafeInteger(priceCents) || priceCents <= 0)
      throw new Error("Sipariş ürün fiyatı geçersiz.");
    fullSubtotal += priceCents * count;
    if (!Number.isSafeInteger(fullSubtotal)) throw new Error("Sipariş satır tutarı geçersiz.");
    originals.set(key, { quantity: count, priceCents });
  }

  const requested = new Set<string>();
  let returnSubtotal = 0;
  for (const item of parseItems(returnItems)) {
    const key = identity(item);
    if (requested.has(key)) throw new Error("İade talebi aynı ürün ve varyant için tekrarlı satır içeriyor.");
    requested.add(key);
    const original = originals.get(key);
    const count = quantity(item);
    if (!original || count > original.quantity)
      throw new Error("İade ürünü veya adedi siparişle uyuşmuyor.");
    returnSubtotal += original.priceCents * count;
  }

  // Preserve the existing proportional allocation of the paid total (discounts/shipping included).
  const refundCents =
    returnSubtotal === fullSubtotal
      ? paidCents
      : Math.round(paidCents * (returnSubtotal / fullSubtotal));
  if (!Number.isSafeInteger(refundCents) || refundCents <= 0 || refundCents > paidCents)
    throw new Error("İade tutarı güvenli biçimde hesaplanamadı.");
  return refundCents / 100;
}
