import { Metadata } from "next";
import { getSeoSiteOrigin } from "@/lib/seo/siteOrigin";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeImageUrl } from "@/lib/utils";
import { buildProductStructuredData } from "@/lib/products/structuredData";
import type { PriceCampaign, PriceVariant } from "@/lib/commerce/catalogPricing";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await the params object before accessing properties
  const resolvedParams = await params;

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("name, description, image")
    .eq("id", resolvedParams.id)
    .maybeSingle();

  if (!product) {
    return {
      title: "Ürün Bulunamadı",
      robots: { index: false, follow: false },
    };
  }

  const imageUrl = sanitizeImageUrl(product.image);

  return {
    title: product.name,
    description: product.description || `${product.name} PrestigeSO'da.`,
    alternates: { canonical: `/product/${resolvedParams.id}` },
    openGraph: {
      title: product.name,
      description: product.description || `${product.name} PrestigeSO'da.`,
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.description || `${product.name} PrestigeSO'da.`,
      images: [imageUrl],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: Props) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isSafeInteger(productId) || productId <= 0) return <>{children}</>;
  const [{ data: product }, campaignResult, variantResult] = await Promise.all([supabaseAdmin
    .from("products")
    .select("id,name,description,image,images,price,discount_price,campaign_start_date,campaign_end_date,stock,SKU")
    .eq("id", productId)
    .maybeSingle(),
    supabaseAdmin.from("campaigns").select("product_ids,discount_percent,start_date,end_date").gte("end_date", new Date().toISOString()),
    supabaseAdmin.from("product_variants").select("id,product_id,price,stock,is_active").eq("product_id", productId).eq("is_active", true),
  ]);
  const siteUrl = getSeoSiteOrigin();
  // Missing pricing dependencies must not publish a misleading offer to crawlers.
  const structuredData = product && !campaignResult.error && !variantResult.error
    ? buildProductStructuredData(product, (campaignResult.data || []) as PriceCampaign[], (variantResult.data || []) as PriceVariant[], sanitizeImageUrl(product.images?.[0] || product.image), siteUrl)
    : null;
  return (
    <>
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData).replace(/</g, "\\u003c")}
        </script>
      )}
      {product && (
        <noscript>
          <article>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
          </article>
        </noscript>
      )}
      {children}
    </>
  );
}
