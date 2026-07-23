import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
  ).toISOString();

  const [
    products,
    slides,
    campaigns,
    categories,
    messages,
    reviews,
    productMetrics,
    questions,
    orders,
    totals,
    monthlyVisits,
    allVisits,
    productCount,
    unreadMessageCount,
    unansweredQuestionCount,
    pendingReviewCount,
    pendingOrderCount,
    stalePaymentCount,
    failedPaymentCount,
    reconciliationCount,
  ] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select(
        'id,name,price,category,stock,"SKU",is_bestseller,discount_price,campaign_start_date,campaign_end_date,created_at,barcode,images,image,description',
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin
      .from("hero_slides")
      .select("id,image_url,title,subtitle,category_slug,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("campaigns")
      .select(
        "id,name,discount_percent,start_date,end_date,product_ids,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("categories")
      .select("id,name,slug,created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("messages")
      .select("id,user_id,user_email,message,answer,created_at,answered_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("reviews")
      .select(
        "id,product_id,user_id,user_name,rating,comment,images,is_approved,created_at,products(name,image,images)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("product_engagement_stats")
      .select("product_id,favorite_count,view_count,rating_avg,review_count")
      .limit(500),
    supabaseAdmin
      .from("questions")
      .select(
        "id,product_id,user_id,user_name,question,answer,created_at,answered_at,is_approved,products(name,image,images)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("orders")
      .select(
        "id,order_no,merchant_oid,user_id,user_email,items,shipping_address,status,total_amount,created_at,shipping_carrier,tracking_number,payment_provider,payment_status,paytr_total_amount,paid_at,failed_reason,return_requests(id,reason,items,evidence_urls,status,admin_note,refund_amount,created_at)",
      )
      .in("payment_status", ["paid", "partially_refunded", "refunded"])
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin.rpc("get_admin_dashboard_totals"),
    supabaseAdmin
      .from("page_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabaseAdmin
      .from("page_views")
      .select("id", { count: "exact", head: true }),
    supabaseAdmin.from("products").select("id", { count: "exact", head: true }),
    supabaseAdmin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .is("answer", null),
    supabaseAdmin
      .from("questions")
      .select("id", { count: "exact", head: true })
      .is("answer", null),
    supabaseAdmin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("is_approved", false),
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .eq("status", "Bekliyor"),
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "pending")
      .lt("reservation_expires_at", new Date().toISOString())
      .is("stock_released_at", null),
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "failed")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .or(
        `reconciliation_status.in.(mismatch,error),and(refund_started_at.lt.${new Date(Date.now() - 15 * 60000).toISOString()},refunded_at.is.null),and(post_payment_processing_at.lt.${new Date(Date.now() - 15 * 60000).toISOString()},post_payment_processed_at.is.null)`,
      ),
  ]);

  const results = [
    products,
    slides,
    campaigns,
    categories,
    messages,
    reviews,
    productMetrics,
    questions,
    orders,
    totals,
  ];
  const firstError = results.find((result) => result.error)?.error;
  const countResults = [
    monthlyVisits,
    allVisits,
    productCount,
    unreadMessageCount,
    unansweredQuestionCount,
    pendingReviewCount,
    pendingOrderCount,
    stalePaymentCount,
    failedPaymentCount,
    reconciliationCount,
  ];
  const countError = countResults.find((result) => result.error)?.error;
  if (firstError || countError) {
    console.error(
      "Admin dashboard query failed:",
      firstError || countError,
    );
    return NextResponse.json(
      { error: "Admin verileri yüklenemedi." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      products: products.data || [],
      slides: slides.data || [],
      campaigns: campaigns.data || [],
      categories: categories.data || [],
      messages: messages.data || [],
      reviews: reviews.data || [],
      productMetrics: productMetrics.data || [],
      questions: questions.data || [],
      orders: orders.data || [],
      totals: totals.data?.[0] || {},
      monthlyVisits: monthlyVisits.count || 0,
      allVisits: allVisits.count || 0,
      counts: {
        products: productCount.count || 0,
        unreadMessages: unreadMessageCount.count || 0,
        unansweredQuestions: unansweredQuestionCount.count || 0,
        pendingReviews: pendingReviewCount.count || 0,
        pendingOrders: pendingOrderCount.count || 0,
        stalePayments: stalePaymentCount.count || 0,
        failedPayments: failedPaymentCount.count || 0,
        reconciliationIssues: reconciliationCount.count || 0,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
