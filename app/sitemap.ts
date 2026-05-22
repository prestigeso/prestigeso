import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://prestigeso.com.tr";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/shop`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/hakkimizda`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/teslimat-bilgileri`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/guvenlik-ve-iade`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/gizlilik-politikasi`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/gizlilik-ilkeleri`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/uyelik-sozlesmesi`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/mesafeli-satis-sozlesmesi`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  try {
    const { data: products } = await supabase
      .from("products")
      .select("id, created_at, stock")
      .gt("stock", 0);

    const productRoutes: MetadataRoute.Sitemap =
      products?.map((product: any) => ({
        url: `${SITE_URL}/product/${product.id}`,
        lastModified: product.created_at
          ? new Date(product.created_at)
          : now,
        changeFrequency: "weekly",
        priority: 0.8,
      })) || [];

    return [...staticRoutes, ...productRoutes];
  } catch {
    return staticRoutes;
  }
}
