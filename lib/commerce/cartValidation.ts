import {
  getProductUnitPrice,
  type PriceCampaign,
  type PriceProduct,
  type PriceVariant,
} from "./catalogPricing.ts";

export type ValidatableCartLine = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  stock?: number;
  variant_id?: number;
};
export type CartValidationData = {
  products: PriceProduct[] | null;
  variants: PriceVariant[] | null;
  campaigns: PriceCampaign[] | null;
  failed: boolean;
};

/** A failed read is not evidence of deletion: never destroy persisted customer selections. */
export function reconcileCart<T extends ValidatableCartLine>(
  cart: T[],
  data: CartValidationData,
  now = Date.now(),
): { cart: T[]; valid: boolean; message: string | null } {
  if (data.failed || !data.products || !data.variants || !data.campaigns) {
    return {
      cart,
      valid: false,
      message:
        "Sepet fiyatı ve stok bilgisi doğrulanamadı. Ürünleriniz korundu; ödeme öncesi tekrar deneyin.",
    };
  }
  let message: string | null = null;
  const next = cart.map((line) => {
    const product = data.products!.find((row) => Number(row.id) === line.id);
    const activeVariants = data.variants!.filter(
      (row) => Number(row.product_id) === line.id && row.is_active !== false,
    );
    const variant = line.variant_id
      ? activeVariants.find((row) => Number(row.id) === line.variant_id)
      : null;
    if (
      !product ||
      (line.variant_id && !variant) ||
      (!line.variant_id && activeVariants.length > 0)
    ) {
      message ||= `${line.name}: ürün veya seçenek artık geçerli değil. Satırı kaldırıp ürün sayfasından yeniden seçin.`;
      return line;
    }
    const stock = Math.max(
      0,
      Math.floor(Number(variant?.stock ?? product.stock) || 0),
    );
    if (stock < line.quantity) {
      message ||= `${line.name}: seçtiğiniz miktar stokta yok (güncel stok: ${stock}). Miktarı azaltın veya satırı kaldırın.`;
    }
    return {
      ...line,
      price: getProductUnitPrice(product, data.campaigns!, variant, now),
      stock,
    };
  });
  return { cart: next, valid: !message, message };
}
