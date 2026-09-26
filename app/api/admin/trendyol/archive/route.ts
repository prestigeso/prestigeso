import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json(
      { error: "Yetkisiz erişim." },
      { status: 401, headers },
    );
  const seller = process.env.TRENDYOL_SELLER_ID,
    environment = process.env.TRENDYOL_ENVIRONMENT;
  if (!seller || !["stage", "production"].includes(environment || ""))
    return NextResponse.json(
      { error: "Trendyol yapılandırılmadı." },
      { status: 503, headers },
    );
  const q = req.nextUrl.searchParams,
    page = Number(q.get("page") || 0),
    search = (q.get("q") || "").trim(),
    status = q.get("status") || "all";
  const states: Record<string, string[]> = {
    Bekliyor: ["Created"],
    Hazırlanıyor: ["Picking", "Invoiced"],
    Kargolandı: ["Shipped"],
    "Teslim Edildi": ["Delivered"],
    returns: ["Cancelled", "Returned"],
  };
  if (
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page > 10000 ||
    search.length > 100 ||
    !(status === "all" || states[status])
  )
    return NextResponse.json(
      { error: "Geçersiz filtre." },
      { status: 400, headers },
    );
  let query = supabaseAdmin
    .from("trendyol_package_mirror")
    .select("payload,seen_at", { count: "exact" })
    .eq("seller_id", seller)
    .eq("environment", environment!);
  if (status !== "all") query = query.in("payload->>status", states[status]);
  // Literal alphanumeric order-number lookup; no PostgREST expression interpolation.
  if (search)
    query = query.ilike(
      "payload->>orderNumber",
      `%${search.replace(/[%_\\]/g, "")}%`,
    );
  const result = await query
    .order("payload->orderDate", { ascending: false })
    .order("package_id")
    .range(page * 50, page * 50 + 49)
    .abortSignal(AbortSignal.timeout(8000));
  if (result.error)
    return NextResponse.json(
      {
        error:
          "Sipariş arşivi okunamadı. Trendyol migration dosyalarını kontrol edin.",
      },
      { status: 503, headers },
    );
  const packages = (result.data || []).map((row) => row.payload);
  return NextResponse.json(
    {
      packages,
      page,
      total: result.count || 0,
      totalPages: Math.ceil((result.count || 0) / 50),
      hasNext: (page + 1) * 50 < (result.count || 0),
      syncEnabled: process.env.TRENDYOL_SYNC_ENABLED === "1",
      archived: true,
    },
    { headers },
  );
}
