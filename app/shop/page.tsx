import ShopClient from "@/components/storefront/ShopClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Campaign, Product } from "@/types";
import { permanentRedirect, redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getShopMetadata } from "@/lib/products/shopMetadata";
import type { PostgrestError } from "@supabase/supabase-js";
import { currentCategoryName } from "@/lib/catalog/categoryAliases";

export const revalidate = 60;

const PAGE_SIZE = 20;

type ShopSearchParams = {
  q?: string;
  category?: string;
  sort?: string;
  page?: string;
  minPrice?: string;
  maxPrice?: string;
  discounted?: string;
  bestseller?: string;
  minRating?: string;
  availability?: string;
  option?: string;
};

function normalizeSearch(value: string | undefined) {
  return (value || "")
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\s-]/gu, "");
}

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return getShopMetadata(searchParams ? await searchParams : {});
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<ShopSearchParams>;
}) {
  const rawParams = searchParams ? await searchParams : {};
  const params = Object.fromEntries(Object.entries(rawParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])) as ShopSearchParams;
  const filterErrors: PostgrestError[] = [];
  const query = normalizeSearch(params.q);
  const category = (params.category || "").trim().slice(0, 100);
  const currentCategory = currentCategoryName(category);
  if (currentCategory !== category) {
    const canonical = new URLSearchParams(Object.entries(params).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
    canonical.set('category', currentCategory);
    permanentRedirect(`/shop?${canonical.toString()}`);
  }
  const sort = ["newest", "price-asc", "price-desc", "name"].includes(
    params.sort || "",
  )
    ? String(params.sort)
    : "newest";
  const requestedPage = Number(params.page || "1");
  const page = Number.isSafeInteger(requestedPage) ? Math.min(10000, Math.max(1, requestedPage)) : 1;
  const parsedMinPrice = Number(params.minPrice);
  const parsedMaxPrice = Number(params.maxPrice);
  const minPrice = Number.isFinite(parsedMinPrice) && parsedMinPrice >= 0 ? parsedMinPrice : null;
  const maxPrice = Number.isFinite(parsedMaxPrice) && parsedMaxPrice >= 0 ? parsedMaxPrice : null;
  const discounted = params.discounted === "1";
  const bestseller = params.bestseller === "1";
  const parsedMinRating = Number(params.minRating);
  const minRating = [1, 2, 3, 4, 5].includes(parsedMinRating)
    ? parsedMinRating
    : null;
  const availability = ["all", "in-stock", "out-of-stock"].includes(
    params.availability || "",
  )
    ? String(params.availability)
    : "in-stock";
  const [optionName = "", optionValue = ""] = String(params.option || "")
    .slice(0, 180)
    .split(":", 2)
    .map((value) => value.trim());
  const from = (page - 1) * PAGE_SIZE;

  let ratingProductIds: number[] | null = null;
  if (minRating !== null) {
    const { data: ratingRows, error: ratingError } = await supabaseAdmin
      .from("product_review_stats")
      .select("product_id")
      .gte("rating_avg", minRating)
      .limit(10000);
    if (ratingError) filterErrors.push(ratingError);
    ratingProductIds = (ratingRows || [])
      .map((row) => Number(row.product_id))
      .filter((id) => Number.isSafeInteger(id) && id > 0);
  }
  let optionProductIds: number[] | null = null;
  if (optionName && optionValue) {
    const { data: optionRows, error: optionError } = await supabaseAdmin
      .from("product_variants")
      .select("product_id")
      .eq("is_active", true)
      .contains("option_values", { [optionName]: optionValue })
      .limit(10000);
    if (optionError) filterErrors.push(optionError);
    optionProductIds = [
      ...new Set((optionRows || []).map((row) => Number(row.product_id))),
    ];
  }

  let productsQuery = supabaseAdmin
    .from("products_public_catalog")
    .select(
      "id,name,price,image,images,category,stock,SKU,barcode,description,is_bestseller,discount_price,campaign_start_date,campaign_end_date,created_at,effective_price,display_base_price,available_stock,has_variants,is_discounted",
      { count: "exact" },
    );

  if (availability === "in-stock") productsQuery = productsQuery.gt("available_stock", 0);
  if (availability === "out-of-stock") productsQuery = productsQuery.eq("available_stock", 0);
  if (ratingProductIds)
    productsQuery = productsQuery.in(
      "id",
      ratingProductIds.length > 0 ? ratingProductIds : [-1],
    );
  if (optionProductIds)
    productsQuery = productsQuery.in(
      "id",
      optionProductIds.length > 0 ? optionProductIds : [-1],
    );

  if (query) {
    productsQuery = productsQuery.or(
      `name.ilike.%${query}%,category.ilike.%${query}%`,
    );
  }
  if (category) productsQuery = productsQuery.eq("category", category);
  if (minPrice !== null) productsQuery = productsQuery.gte("effective_price", minPrice);
  if (maxPrice !== null) productsQuery = productsQuery.lte("effective_price", maxPrice);
  if (discounted) productsQuery = productsQuery.eq("is_discounted", true);
  if (bestseller) productsQuery = productsQuery.eq("is_bestseller", true);

  if (sort === "price-asc")
    productsQuery = productsQuery.order("effective_price", { ascending: true });
  else if (sort === "price-desc")
    productsQuery = productsQuery.order("effective_price", { ascending: false });
  else if (sort === "name")
    productsQuery = productsQuery.order("name", { ascending: true });
  else productsQuery = productsQuery.order("created_at", { ascending: false });
  productsQuery = productsQuery.order("id", { ascending: true });

  const [productsResult, campaignsResult, categoriesResult, variantOptionsResult] = await Promise.all(
    [
      productsQuery.range(from, from + PAGE_SIZE - 1),
      supabaseAdmin
        .from("campaigns")
        .select(
          "id,name,discount_percent,product_ids,start_date,end_date,created_at",
        )
        .gte("end_date", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin.from("categories").select("name").order("name").limit(100),
      supabaseAdmin
        .from("product_variants")
        .select("option_values")
        .eq("is_active", true)
        .limit(1000),
    ],
  );

  const productsError =
    productsResult.error?.code === "PGRST103" && page > 1
      ? null
      : productsResult.error;
  const failures = [
    { ...productsResult, error: productsError },
    campaignsResult,
    categoriesResult,
    variantOptionsResult,
  ]
    .map((result) => result.error)
    .filter(Boolean).concat(filterErrors);
  const catalogErrorId = failures.length ? randomUUID() : undefined;
  if (failures.length > 0)
    console.error("Mağaza verisi yüklenemedi:", catalogErrorId, failures);

  const total = productsResult.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (!catalogErrorId && page > totalPages) {
    const canonical = new URLSearchParams();
    if (query) canonical.set("q", query);
    if (category) canonical.set("category", category);
    if (sort !== "newest") canonical.set("sort", sort);
    if (minPrice !== null) canonical.set("minPrice", String(minPrice));
    if (maxPrice !== null) canonical.set("maxPrice", String(maxPrice));
    if (discounted) canonical.set("discounted", "1");
    if (bestseller) canonical.set("bestseller", "1");
    if (minRating !== null) canonical.set("minRating", String(minRating));
    if (availability !== "in-stock") canonical.set("availability", availability);
    if (optionName && optionValue) canonical.set("option", `${optionName}:${optionValue}`);
    if (totalPages > 1) canonical.set("page", String(totalPages));
    redirect(canonical.size ? `/shop?${canonical}` : "/shop");
  }

  return (
    <ShopClient
      key={`${query}\u0000${category}\u0000${sort}\u0000${page}`}
      initialProducts={(productsResult.data || []) as Product[]}
      catalogErrorId={catalogErrorId}
      initialCampaigns={(campaignsResult.data || []) as Campaign[]}
      initialCategories={[
        "Tümü",
        ...(categoriesResult.data || []).map((category) =>
          String(category.name),
        ),
      ]}
      query={query}
      category={category}
      sort={sort}
      page={page}
      pageSize={PAGE_SIZE}
      total={productsResult.count || 0}
      minPrice={minPrice}
      maxPrice={maxPrice}
      discounted={discounted}
      bestseller={bestseller}
      minRating={minRating}
      availability={availability}
      option={optionName && optionValue ? `${optionName}:${optionValue}` : ""}
      variantOptions={[
        ...new Set(
          (variantOptionsResult.data || []).flatMap((row) =>
            row.option_values && typeof row.option_values === "object" && !Array.isArray(row.option_values)
              ? Object.entries(row.option_values).map(([name, value]) => `${name}:${String(value)}`)
              : [],
          ),
        ),
      ].sort((a, b) => a.localeCompare(b, "tr"))}
    />
  );
}
