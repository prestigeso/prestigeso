import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { buildAnalyticsReport, type Dataset } from "@/lib/analytics/report";
import { ANALYTICS_POLICY } from "@/lib/analytics/policy";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const headers = { "Cache-Control": "no-store" };
  try {
    const limit = await consumeRateLimit({ bucket: "analytics-report", identifier: getClientIp(req), maxRequests: 30, windowSeconds: 3600 });
    if (!limit.allowed) return NextResponse.json({ error: "Rapor istek sınırı." }, { status: 429, headers });
    const q = req.nextUrl.searchParams;
    const days = Number(q.get("days") || 7), device = q.get("device") || "all", source = q.get("source") || "all", traffic = q.get("traffic") || "normal", audience = q.get("audience") || "all";
    if (![1, 7, 14, 30].includes(days) || !["all", "ios", "android", "desktop_other"].includes(device) || !["all", "direct", "search", "social", "internal", "other"].includes(source) || !["normal", "all", "staff", "suspected"].includes(traffic) || !["all", "new", "returning"].includes(audience)) return NextResponse.json({ error: "Geçersiz filtre." }, { status: 400, headers });
    const now = Date.now(), since = new Date(now - 30 * 86400000).toISOString();
    async function read(table: string, fields: string, dateColumn: string, order: string) {
      const rows: Record<string, unknown>[] = [];
      for (let offset = 0; offset <= 20000;) {
        const { data, error, count } = await supabaseAdmin.from(table).select(fields, { count: "exact" }).gte(dateColumn, since).lte(dateColumn, new Date(now).toISOString()).order(order).range(offset, offset + 999).abortSignal(AbortSignal.timeout(8000));
        if (error) throw error;
        if (count === null) throw new Error("REPORT_COUNT_MISSING");
        if (count > 20000 || offset + (data?.length || 0) > 20000) throw new Error("REPORT_CAPACITY");
        rows.push(...(data || []) as unknown as Record<string, unknown>[]);
        if (rows.length >= count) return rows;
        if (!data?.length) throw new Error("REPORT_INCOMPLETE");
        offset += data.length;
      }
      return rows;
    }
    const [sessions, events, orders, links, paidOrders] = await Promise.all([
      read("analytics_sessions", "id,visitor_id,started_at,last_seen,entry_page,source,device,traffic", "started_at", "id"),
      read("analytics_events", "sequence,session_id,visitor_id,received_at,payload", "received_at", "sequence"),
      // Include pending attempts too; finance below uses paid_at and confirmed status only.
      read("orders", "id,payment_status,total_amount,refunded_amount,paid_at,created_at", "created_at", "id"),
      read("analytics_order_links", "order_id,visitor_id,session_id,cart_id,attempt_id,created_at", "created_at", "order_id"),
      read("orders", "id,payment_status,total_amount,refunded_amount,paid_at,created_at", "paid_at", "id"),
    ]);
    const mergedOrders = [...new Map([...orders, ...paidOrders].map((o) => [o.id, o])).values()];
    const data = { sessions, events, orders: mergedOrders, links } as unknown as Dataset;
    const productIds = [...new Set(data.events.map((e) => e.payload.productId).filter((id): id is number => Number.isSafeInteger(id) && Number(id) > 0))];
    const catalog: Record<string, { name: string; sku: string }> = {};
    // Bounded display enrichment; metric counts remain complete even for deleted products.
    for (let offset = 0; offset < Math.min(productIds.length, 1000); offset += 100) {
      const result = await supabaseAdmin.from("products").select('id,name,"SKU"').in("id", productIds.slice(offset, offset + 100)).abortSignal(AbortSignal.timeout(5000));
      if (result.error) break;
      for (const p of result.data || []) catalog[String(p.id)] = { name: String(p.name), sku: String(p.SKU) };
    }
    const visitor = q.get("visitor");
    const timelinePage = Number(q.get("timelinePage") || 0);
    if (!Number.isInteger(timelinePage) || timelinePage < 0 || timelinePage > 40) return NextResponse.json({ error: "Geçersiz geçmiş sayfası." }, { status: 400 });
    if (visitor && !/^[a-f0-9-]{36}$/.test(visitor)) return NextResponse.json({ error: "Geçersiz ziyaretçi." }, { status: 400 });
    const timeline = visitor ? data.events.filter((e) => e.visitor_id === visitor).sort((a, b) => a.sequence - b.sequence) : [];
    return NextResponse.json({ ...buildAnalyticsReport(data, { days, device, source, traffic, audience }, now), policy: ANALYTICS_POLICY,
      catalog, timeline: timeline.slice(timelinePage * 500, timelinePage * 500 + 500), timelineTotal: timeline.length, timelinePage }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && error.message === "REPORT_CAPACITY" ? "Rapor 20.000 kayıt sınırını aşıyor. Kısmi sonuç gösterilmedi; sunucu özetleme kapasitesi artırılmalı." : "Ölçüm raporu alınamadı. Faz 1 migration ve bağlantıyı kontrol edin." }, { status: 503, headers });
  }
}
