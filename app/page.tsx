import HomeClient, {
  type HomepageProduct,
} from "@/components/storefront/HomeClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Campaign, HeroSlide } from "@/types";

export const revalidate = 60;

type ReviewStat = {
  product_id: number;
  rating_avg: number | string;
  review_count: number | string;
};

export default async function HomePage() {
  const now = new Date().toISOString();
  const productsResult = await supabaseAdmin
    .from("products")
    .select(
      "id,name,price,category,stock,images,image,is_bestseller,discount_price,created_at",
    )
    .gt("stock", 0)
    .order("created_at", { ascending: false })
    .limit(60);
  const productIds = (productsResult.data || []).map((product) => product.id);
  const [
    statsResult,
    campaignsResult,
    slidesResult,
    categoriesResult,
    marqueeResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("product_review_stats")
      .select("product_id,rating_avg,review_count")
      .in("product_id", productIds.length > 0 ? productIds : [-1]),
    supabaseAdmin
      .from("campaigns")
      .select(
        "id,name,discount_percent,product_ids,start_date,end_date,created_at",
      )
      .gte("end_date", now)
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("hero_slides")
      .select("id,title,subtitle,image_url,category_slug,created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabaseAdmin
      .from("categories")
      .select("name,slug")
      .order("name")
      .limit(100),
    supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "marquee")
      .maybeSingle(),
  ]);

  const failures = [
    productsResult,
    statsResult,
    campaignsResult,
    slidesResult,
    categoriesResult,
  ]
    .map((result) => result.error)
    .filter(Boolean);
  if (failures.length > 0)
    console.error("Vitrin verisi kısmen yüklenemedi:", failures);

  const statsByProduct = new Map(
    ((statsResult.data || []) as ReviewStat[]).map((stat) => [
      Number(stat.product_id),
      {
        ratingAvg: Number(stat.rating_avg || 0),
        reviewCount: Number(stat.review_count || 0),
      },
    ]),
  );
  const products = ((productsResult.data || []) as HomepageProduct[]).map(
    (product) => ({
      ...product,
      ...(statsByProduct.get(Number(product.id)) || {
        ratingAvg: 0,
        reviewCount: 0,
      }),
    }),
  );
  const marqueeValue = marqueeResult.data?.value;

  return (
    <HomeClient
      initialProducts={products}
      initialCampaigns={(campaignsResult.data || []) as Campaign[]}
      initialHeroSlides={(slidesResult.data || []) as HeroSlide[]}
      initialCategories={
        (categoriesResult.data || []) as Array<{ name: string; slug: string }>
      }
      initialMarquee={
        typeof marqueeValue === "string" ? marqueeValue.slice(0, 200) : ""
      }
    />
  );
}
