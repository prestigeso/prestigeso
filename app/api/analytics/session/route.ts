import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isTrustedAdminMutationRequest } from "@/lib/adminSecurity";
import { isAdminRequest } from "@/lib/adminRequest";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { limitedJson } from "@/lib/http/limitedJson";
import { ANALYTICS_COOKIE, readVisitor, signVisitor } from "@/lib/analytics/server";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(req: NextRequest) {
  if (!isTrustedAdminMutationRequest(req)) return new NextResponse(null, { status: 403 });
  try {
    const body = await limitedJson(req, 1024) as Record<string, unknown>;
    if (!body || body.consent !== true || !["home", "shop", "product", "checkout", "other"].includes(String(body.page)) || !["direct", "search", "social", "internal", "other"].includes(String(body.source))) return new NextResponse(null, { status: 400 });
    const limit = await consumeRateLimit({ bucket: "analytics-session", identifier: getClientIp(req), maxRequests: 60, windowSeconds: 3600 });
    if (!limit.allowed) return new NextResponse(null, { status: 429 });
    const visitorId = readVisitor(req) || randomUUID();
    // Validate signing configuration before the RPC creates a persistent row.
    const signedVisitor = signVisitor(visitorId);
    const ua = req.headers.get("user-agent") || "";
    const device = /iPhone|iPad/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "desktop_other";
    const traffic = await isAdminRequest(req) ? "staff" : /bot|crawler|spider|headless/i.test(ua) ? "suspected" : "normal";
    const { data, error } = await supabaseAdmin.rpc("analytics_open_session", { p_visitor: visitorId, p_page: body.page, p_source: body.source, p_device: device, p_traffic: traffic });
    if (error) throw error;
    const categories = await supabaseAdmin.from("categories").select("id,name").limit(500);
    const response = NextResponse.json({ visitorId, sessionId: data, categories: categories.data || [] }, { headers });
    response.cookies.set(ANALYTICS_COOKIE, signedVisitor, { httpOnly: true, secure: new URL(req.url).protocol === "https:", sameSite: "strict", path: "/", maxAge: 30 * 86400 });
    return response;
  } catch { return NextResponse.json({ error: "Ölçüm kullanılamıyor." }, { status: 503, headers }); }
}
export async function DELETE(req: NextRequest) {
  if (!isTrustedAdminMutationRequest(req)) return new NextResponse(null, { status: 403 });
  const visitor = readVisitor(req);
  if (visitor) {
    // Keep cookie on failure so the next visit can retry deleting this visitor's data.
    const { error } = await supabaseAdmin.rpc("analytics_revoke", { p_visitor: visitor });
    if (error) return new NextResponse(null, { status: 503, headers });
  }
  const response = new NextResponse(null, { status: 204, headers });
  response.cookies.set(ANALYTICS_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
