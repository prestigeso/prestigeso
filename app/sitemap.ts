import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildSitemapEntries,
  readSitemapRows,
  type SitemapProduct,
  type SitemapCategory,
} from "@/lib/seo/sitemapData";

import { getSeoSiteOrigin } from "@/lib/seo/siteOrigin";

const SITE_URL = getSeoSiteOrigin();
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Throw on upstream errors instead of publishing a successful but incomplete sitemap.
  // No stock filter: temporarily sold-out product pages remain useful and indexable.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const [products, categories] = await Promise.all([
      readSitemapRows<SitemapProduct>(async (afterId, limit) =>
        supabaseAdmin
          .from("products")
          .select("id,updated_at,created_at")
          .gt("id", afterId)
          .order("id")
          .limit(limit)
          .abortSignal(controller.signal),
      ),
      readSitemapRows<SitemapCategory>(
        async (afterId, limit) =>
          supabaseAdmin
            .from("categories")
            .select("id,name")
            .gt("id", afterId)
            .order("id")
            .limit(limit)
            .abortSignal(controller.signal),
        1000,
      ),
    ]);
    return buildSitemapEntries(SITE_URL, products, categories);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
