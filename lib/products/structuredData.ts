import {
  getProductOfferSummary,
  type PriceProduct,
  type PriceCampaign,
  type PriceVariant,
} from "../commerce/catalogPricing.ts";

export function buildProductStructuredData(
  product: PriceProduct & {
    name: string;
    description?: string | null;
    SKU: string;
  },
  campaigns: readonly PriceCampaign[],
  variants: readonly PriceVariant[],
  image: string,
  siteUrl: string,
  now = Date.now(),
) {
  const summary = getProductOfferSummary(product, campaigns, variants, now);
  const common = {
    url: `${siteUrl.replace(/\/$/, "")}/product/${product.id}`,
    priceCurrency: "TRY",
    availability:
      summary.availableStock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
  };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image,
    sku: product.SKU,
    offers: summary.hasVariants
      ? {
          "@type": "AggregateOffer",
          ...common,
          lowPrice: summary.lowPrice,
          highPrice: summary.highPrice,
          offerCount: summary.offerCount,
        }
      : { "@type": "Offer", ...common, price: summary.lowPrice },
  };
}
