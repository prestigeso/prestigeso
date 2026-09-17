import type { MetadataRoute } from "next";
import { publicContentPages } from "./pageMetadata.ts";
import { getShopMetadata } from "../products/shopMetadata.ts";

export type SitemapProduct = {
  id: number;
  updated_at?: string | null;
  created_at?: string | null;
};
export type SitemapCategory = { id: number; name: string };

/** Keyset pagination keeps working when a PostgREST server caps a page below our requested size. */
export async function readSitemapRows<T extends { id: number }>(
  readPage: (
    afterId: number,
    limit: number,
  ) => Promise<{ data: T[] | null; error: unknown }>,
  maximumRows = 48000,
  pageSize = 500,
): Promise<T[]> {
  if (
    !Number.isSafeInteger(maximumRows) ||
    maximumRows < 1 ||
    !Number.isSafeInteger(pageSize) ||
    pageSize < 1
  )
    throw new Error("SITEMAP_INVALID_PAGING_LIMIT");
  const rows: T[] = [];
  let afterId = 0;
  // An empty response, not a short page, marks completion. Even a cap of 1 is bounded.
  for (let page = 0; page <= maximumRows; page++) {
    const result = await readPage(afterId, pageSize);
    if (result.error || !Array.isArray(result.data))
      throw new Error("SITEMAP_DATA_UNAVAILABLE");
    if (result.data.length === 0) return rows;
    for (const row of result.data) {
      if (!Number.isSafeInteger(Number(row.id)) || Number(row.id) <= afterId)
        throw new Error("SITEMAP_INVALID_PAGE_ORDER");
      afterId = Number(row.id);
      rows.push(row);
      if (rows.length > maximumRows)
        throw new Error("SITEMAP_CAPACITY_EXCEEDED_SPLIT_REQUIRED");
    }
  }
  throw new Error("SITEMAP_PAGING_DID_NOT_FINISH");
}

function lastModified(product: SitemapProduct) {
  const source = product.updated_at || product.created_at;
  if (!source) return undefined;
  const date = new Date(source);
  if (!Number.isFinite(date.valueOf()))
    throw new Error("SITEMAP_INVALID_UPDATED_AT");
  return date;
}

export function buildSitemapEntries(
  siteUrl: string,
  products: SitemapProduct[],
  categories: SitemapCategory[],
): MetadataRoute.Sitemap {
  const origin = new URL(siteUrl);
  if (!["https:", "http:"].includes(origin.protocol))
    throw new Error("SITEMAP_INVALID_ORIGIN");
  const base = origin.origin;
  const productEntries = products.map((product) => ({
    url: `${base}/product/${product.id}`,
    lastModified: lastModified(product),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const latestProductUpdate = productEntries.reduce<Date | undefined>(
    (latest, product) =>
      !latest || (product.lastModified && product.lastModified > latest)
        ? product.lastModified
        : latest,
    undefined,
  );
  const categoryNames = [
    ...new Set(
      categories.map((category) => category.name.trim()).filter(Boolean),
    ),
  ];
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/`,
      ...(latestProductUpdate ? { lastModified: latestProductUpdate } : {}),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${base}/shop`,
      ...(latestProductUpdate ? { lastModified: latestProductUpdate } : {}),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...Object.keys(publicContentPages).map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...categoryNames.map((name) => ({
      url: `${base}${getShopMetadata({ category: name }).alternates.canonical}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...productEntries,
  ];
  if (entries.length > 50000)
    throw new Error("SITEMAP_CAPACITY_EXCEEDED_SPLIT_REQUIRED");
  return entries;
}
