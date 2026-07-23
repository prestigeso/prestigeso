import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const LIST_CONFIG = {
  messages: {
    select: "id,user_id,user_email,message,answer,created_at,answered_at",
  },
  questions: {
    select:
      "id,product_id,user_id,user_name,question,answer,created_at,answered_at,is_approved,products(name,image,images)",
  },
  orders: {
    select:
      "id,order_no,merchant_oid,user_id,user_email,items,shipping_address,status,total_amount,created_at,shipping_carrier,tracking_number,payment_provider,payment_status,paytr_total_amount,paid_at,failed_reason,return_requests(id,reason,items,evidence_urls,status,admin_note,refund_amount,created_at)",
  },
} as const;

type ListResource = keyof typeof LIST_CONFIG;

function isListResource(value: string): value is ListResource {
  return Object.hasOwn(LIST_CONFIG, value);
}

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const resource = req.nextUrl.searchParams.get("resource") || "";
  if (!isListResource(resource)) {
    return NextResponse.json(
      { error: "Geçersiz liste kaynağı." },
      { status: 400 },
    );
  }

  const parsedPage = Number.parseInt(
    req.nextUrl.searchParams.get("page") || "1",
    10,
  );
  const parsedLimit = Number.parseInt(
    req.nextUrl.searchParams.get("limit") || "25",
    10,
  );
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(50, Math.max(10, parsedLimit))
    : 25;
  const from = (page - 1) * limit;

  let query = supabaseAdmin
    .from(resource)
    .select(LIST_CONFIG[resource].select, { count: "exact" });

  if (resource === "orders") {
    query = query.in("payment_status", ["paid", "partially_refunded", "refunded"]);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) {
    console.error("Admin list query failed:", { resource, code: error.code });
    return NextResponse.json({ error: "Liste yüklenemedi." }, { status: 500 });
  }

  return NextResponse.json(
    { items: data || [], page, limit, total: count || 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}
