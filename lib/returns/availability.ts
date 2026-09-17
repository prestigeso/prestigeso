export type AvailableReturnItem = {
  lineId: string;
  id: number;
  variant_id?: number;
  name: string;
  quantity: number;
};

function integer(value: unknown): number {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value))) return NaN;
  return Number(value);
}

/** UI boundary only. The database repeats these checks under an order lock on submission. */
export function parseAvailableReturnItems(value: unknown): AvailableReturnItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("İade bilgileri okunamadı.");
  const data = value as Record<string, unknown>;
  if (data.eligible !== true || !Array.isArray(data.items))
    throw new Error("İade süresi dolmuş, bekleyen bir talebiniz var veya iade edilebilir ürün kalmamış olabilir. Güncel durum için destek ekibiyle iletişime geçin.");
  const seen = new Set<string>();
  const items = data.items.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("İade satırı geçersiz.");
    const row = raw as Record<string, unknown>;
    const id = integer(row.product_id);
    const variant = integer(row.variant_id);
    const purchased = integer(row.purchased);
    const reserved = integer(row.reserved);
    const returned = integer(row.returned);
    const quantity = integer(row.remaining);
    if (![id,variant,purchased,reserved,returned,quantity].every(Number.isSafeInteger) ||
      id <= 0 || variant < 0 || purchased <= 0 || reserved < 0 || returned < 0 || quantity < 0 ||
      purchased !== reserved + returned + quantity) throw new Error("İade adetleri doğrulanamadı.");
    const lineId = `${id}:${variant}`;
    if (seen.has(lineId)) throw new Error("Tekrarlı iade satırı alındı.");
    seen.add(lineId);
    return { lineId, id, ...(variant > 0 ? { variant_id: variant } : {}), name: String(row.name || "Ürün"), quantity };
  }).filter((item) => item.quantity > 0);
  if (!items.length) throw new Error("İade edilebilir ürün kalmamış.");
  return items;
}
