import { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeImageUrl } from "@/lib/utils";
import { getEffectiveUnitPrice } from "@/lib/commerce/pricing";

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
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id,name,description,image,price,discount_price,stock,SKU")
    .eq("id", id)
    .maybeSingle();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const structuredData = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || undefined,
        image: sanitizeImageUrl(product.image),
        sku: product.SKU,
        offers: {
          "@type": "Offer",
          url: `${siteUrl}/product/${product.id}`,
          priceCurrency: "TRY",
          price: getEffectiveUnitPrice({
            basePrice: product.price,
            discountPrice: product.discount_price,
          }),
          availability:
            Number(product.stock) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
      }
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
