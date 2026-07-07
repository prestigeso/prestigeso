import { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeImageUrl } from "@/lib/utils";

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
      title: "Ürün Bulunamadı | PrestigeSO",
    };
  }

  const imageUrl = sanitizeImageUrl(product.image);

  return {
    title: `${product.name} | PrestigeSO`,
    description: product.description || `${product.name} PrestigeSO'da.`,
    openGraph: {
      title: `${product.name} | PrestigeSO`,
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
      title: `${product.name} | PrestigeSO`,
      description: product.description || `${product.name} PrestigeSO'da.`,
      images: [imageUrl],
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
