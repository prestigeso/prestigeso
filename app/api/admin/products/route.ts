import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PAGE_SIZE = 25;

function cleanSearch(value: string) {
  return value
    .trim()
    .slice(0, 80)
    .replace(/[^\p{L}\p{N}\s-]/gu, "");
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });

  const parsedPage = Number.parseInt(
    req.nextUrl.searchParams.get("page") || "1",
    10,
  );
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const queryText = cleanSearch(req.nextUrl.searchParams.get("q") || "");
  const stock = req.nextUrl.searchParams.get("stock") || "all";
  const category = (req.nextUrl.searchParams.get("category") || "").slice(
    0,
    100,
  );
  const sort = req.nextUrl.searchParams.get("sort") || "newest";
  const from = (page - 1) * PAGE_SIZE;

  let query = supabaseAdmin
    .from("products")
    .select(
      'id,name,price,category,stock,"SKU",is_bestseller,discount_price,campaign_start_date,campaign_end_date,created_at,barcode,images,image,description',
      { count: "exact" },
    );
  if (queryText)
    query = query.or(
      `name.ilike.%${queryText}%,SKU.ilike.%${queryText}%,barcode.ilike.%${queryText}%`,
    );
  if (stock === "in") query = query.gt("stock", 0);
  if (stock === "out") query = query.lte("stock", 0);
  if (category) query = query.eq("category", category);

  if (sort === "oldest") query = query.order("created_at", { ascending: true });
  else if (sort === "price_asc")
    query = query.order("price", { ascending: true });
  else if (sort === "price_desc")
    query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const [products, outOfStock] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    supabaseAdmin
      .from("products")
      .select("id", { count: "exact", head: true })
      .lte("stock", 0),
  ]);
  if (products.error || outOfStock.error) {
    return NextResponse.json(
      { error: "Ürün listesi yüklenemedi." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      products: products.data || [],
      page,
      pageSize: PAGE_SIZE,
      total: products.count || 0,
      outOfStockTotal: outOfStock.count || 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
