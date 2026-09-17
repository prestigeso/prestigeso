import { getEffectiveUnitPrice } from "./pricing.ts";

export type PriceProduct = {
  id: number;
  price?: unknown;
  discount_price?: unknown;
  campaign_start_date?: string | null;
  campaign_end_date?: string | null;
  stock?: unknown;
};
export type PriceVariant = {
  id: number;
  product_id: number;
  price?: unknown;
  stock?: unknown;
  is_active?: boolean;
};
export type PriceCampaign = {
  product_ids: unknown;
  discount_percent: unknown;
  start_date: string;
  end_date: string;
};

export function isPriceWindowActive(
  start: string | null | undefined,
  end: string | null | undefined,
  now = Date.now(),
) {
  const from = start ? Date.parse(start) : -Infinity;
  const until = end ? Date.parse(end) : Infinity;
  return now >= from && now <= until;
}

function campaignContains(campaign: PriceCampaign, productId: number) {
  try {
    const ids =
      typeof campaign.product_ids === "string"
        ? JSON.parse(campaign.product_ids)
        : campaign.product_ids;
    return Array.isArray(ids) && ids.some((id) => Number(id) === productId);
  } catch {
    return false;
  }
}

/** Overlapping campaigns never stack: the best valid percentage wins. */
export function getActivePriceCampaign<T extends PriceCampaign>(
  productId: number,
  campaigns: readonly T[],
  now = Date.now(),
): T | null {
  return campaigns.reduce<T | null>((best, campaign) => {
    const percent = Number(campaign.discount_percent);
    if (
      !Number.isFinite(percent) ||
      percent <= 0 ||
      percent >= 100 ||
      !campaignContains(campaign, productId) ||
      !isPriceWindowActive(campaign.start_date, campaign.end_date, now)
    )
      return best;
    return !best || percent > Number(best.discount_percent) ? campaign : best;
  }, null);
}

/** The checkout, detail, cart and SQL catalogue projection share these rules. */
export function getProductUnitPrice(
  product: PriceProduct,
  campaigns: readonly PriceCampaign[],
  variant?: PriceVariant | null,
  now = Date.now(),
) {
  const basePrice = variant?.price == null ? product.price : variant.price;
  const fixedIsActive = isPriceWindowActive(
    product.campaign_start_date,
    product.campaign_end_date,
    now,
  );
  return getEffectiveUnitPrice({
    basePrice,
    discountPrice:
      variant?.price == null && fixedIsActive
        ? product.discount_price
        : undefined,
    campaignPercent: getActivePriceCampaign(Number(product.id), campaigns, now)
      ?.discount_percent,
  });
}

/** An in-stock option supplies the advertised starting price; sold-out options do not undercut it. */
export function getProductOfferSummary(
  product: PriceProduct,
  campaigns: readonly PriceCampaign[],
  variants: readonly PriceVariant[],
  now = Date.now(),
) {
  const activeVariants = variants.filter(
    (variant) =>
      Number(variant.product_id) === Number(product.id) &&
      variant.is_active !== false,
  );
  const inStock = activeVariants.filter((variant) => Number(variant.stock) > 0);
  const choices: Array<PriceVariant | null> = activeVariants.length
    ? inStock.length
      ? inStock
      : activeVariants
    : [null];
  const offers = choices
    .map((variant) => ({
      price: getProductUnitPrice(product, campaigns, variant, now),
      basePrice: Number(variant?.price ?? product.price ?? 0),
      variantId: variant?.id ?? null,
    }))
    .sort(
      (a, b) => a.price - b.price || Number(a.variantId) - Number(b.variantId),
    );
  return {
    lowPrice: offers[0].price,
    highPrice: offers[offers.length - 1].price,
    displayBasePrice: offers[0].basePrice,
    offerCount: offers.length,
    hasVariants: activeVariants.length > 0,
    availableStock: activeVariants.length
      ? activeVariants.reduce(
          (sum, variant) => sum + Math.max(0, Number(variant.stock) || 0),
          0,
        )
      : Math.max(0, Number(product.stock) || 0),
  };
}
