import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { fetchTrendyolPackages, validatePackageQuery } from "@/lib/trendyol/packages";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401, headers });
  if (process.env.TRENDYOL_READ_ONLY_ENABLED !== "1") return NextResponse.json({ error: "Trendyol salt okunur bağlantısı henüz etkin değil." }, { status: 503, headers });
  const q = req.nextUrl.searchParams;
  const query = { start: Number(q.get("start")), end: Number(q.get("end")), page: Number(q.get("page") || 0) };
  try { if (!q.has("start") || !q.has("end")) throw new Error(); validatePackageQuery(query); } catch { return NextResponse.json({ error: "En fazla 14 günlük geçerli tarih aralığı seçin." }, { status: 400, headers }); }
  try {
    const ip = await consumeRateLimit({ bucket: "trendyol-read-ip", identifier: getClientIp(req), maxRequests: 30, windowSeconds: 60 });
    const global = await consumeRateLimit({ bucket: "trendyol-read-global", identifier: "single-store", maxRequests: 30, windowSeconds: 60 });
    if (!ip.allowed || !global.allowed) return NextResponse.json({ error: "İstek sınırı; bir dakika sonra tekrar deneyin." }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
    const environment = process.env.TRENDYOL_ENVIRONMENT;
    if (environment !== "stage" && environment !== "production") throw new Error("CONFIGURATION_REQUIRED");
    const result = await fetchTrendyolPackages({ sellerId: process.env.TRENDYOL_SELLER_ID || "", apiKey: process.env.TRENDYOL_API_KEY || "", apiSecret: process.env.TRENDYOL_API_SECRET || "", environment }, query);
    return NextResponse.json({ ...result, environment, fetchedAt: new Date().toISOString(), readOnly: true }, { headers });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const messages: Record<string, string> = { CONFIGURATION_REQUIRED: "Sunucu Trendyol yapılandırması eksik.", PROVIDER_AUTH: "Trendyol kimlik doğrulamasını reddetti; ortam ve anahtarları kontrol edin.", PROVIDER_RATE_LIMIT: "Trendyol istek sınırı; daha sonra tekrar deneyin.", NARROW_DATE_RANGE: "10.000 paket sınırı aşıldı; tarih aralığını daraltın. Kısmi liste gösterilmedi." };
    return NextResponse.json({ error: messages[code] || "Trendyol verisi doğrulanamadı veya bağlantı kurulamadı. Boş sipariş listesi varsayılmadı." }, { status: code === "PROVIDER_RATE_LIMIT" ? 429 : 502, headers });
  }
}
