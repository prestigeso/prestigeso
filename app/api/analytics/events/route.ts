import { NextRequest, NextResponse } from "next/server";
import { isTrustedAdminMutationRequest } from "@/lib/adminSecurity";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { limitedJson } from "@/lib/http/limitedJson";
import { readVisitor } from "@/lib/analytics/server";
import { parseBrowserEvents } from "@/lib/analytics/contract";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export async function POST(req: NextRequest) {
  if (!isTrustedAdminMutationRequest(req)) return new NextResponse(null, { status: 403 });
  const visitor = readVisitor(req);
  if (!visitor) return new NextResponse(null, { status: 401 });
  try {
    const [limit, ipLimit] = await Promise.all([
      consumeRateLimit({ bucket: "analytics-events", identifier: visitor, maxRequests: 600, windowSeconds: 3600 }),
      consumeRateLimit({ bucket: "analytics-events-ip", identifier: getClientIp(req), maxRequests: 1200, windowSeconds: 3600 }),
    ]);
    if (!limit.allowed || !ipLimit.allowed) return new NextResponse(null, { status: 429 });
    const events = parseBrowserEvents(await limitedJson(req));
    if (!events || events.some((e) => e.visitorId !== visitor)) return new NextResponse(null, { status: 400 });
    for (const [table, ids] of [
      ["products", [...new Set(events.flatMap((e) => e.productId ? [e.productId] : []))]],
      ["categories", [...new Set(events.flatMap((e) => e.categoryId ? [e.categoryId] : []))]],
    ] as const) {
      if (!ids.length) continue;
      const { data, error } = await supabaseAdmin.from(table).select("id").in("id", ids).abortSignal(AbortSignal.timeout(3000));
      if (error) return new NextResponse(null, { status: 503 });
      if (!data || data.length !== ids.length) return new NextResponse(null, { status: 400 });
    }
    const { error } = await supabaseAdmin.rpc("analytics_ingest", { p_visitor: visitor, p_events: events });
    return new NextResponse(null, { status: error ? 409 : 204, headers: { "Cache-Control": "no-store" } });
  } catch { return new NextResponse(null, { status: 400 }); }
}
