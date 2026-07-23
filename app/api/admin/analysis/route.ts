import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const [orders, visits, products, productMetrics] = await Promise.all([
    supabaseAdmin
      .from("admin_daily_order_stats")
      .select("day,order_count,revenue")
      .order("day", { ascending: false })
      .limit(3660),
    supabaseAdmin
      .from("admin_daily_visit_stats")
      .select("day,visit_count")
      .order("day", { ascending: false })
      .limit(3660),
    supabaseAdmin
      .from("products")
      .select("id,name,stock")
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("product_engagement_stats")
      .select("product_id,favorite_count,view_count,rating_avg,review_count")
      .limit(500),
  ]);
  const results = { orders, visits, products, productMetrics };
  const error = Object.values(results).find((result) => result.error)?.error;
  if (error)
    return NextResponse.json(
      { error: "Analiz verileri yüklenemedi." },
      { status: 500 },
    );
  return NextResponse.json(
    Object.fromEntries(
      Object.entries(results).map(([key, value]) => [key, value.data || []]),
    ),
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
