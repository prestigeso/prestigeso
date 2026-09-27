import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { limitedJson } from "@/lib/http/limitedJson";
import { consumeRateLimit } from "@/lib/rateLimit";
import { fetchTrendyolStream } from "@/lib/trendyol/stream";
import { syncAutomaticPage } from "@/lib/trendyol/auto-sync";
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
  const [jobs, packages, mappings, catalog] = await Promise.all([
    supabaseAdmin
      .from("trendyol_sync_jobs")
      .select("id,revision,status,starts_at,ends_at,updated_at")
      .eq("seller_id", seller)
      .eq("environment", environment!)
      .order("created_at", { ascending: false })
      .limit(10),
    supabaseAdmin
      .from("trendyol_package_mirror")
      .select("package_id,payload,seen_at")
      .eq("seller_id", seller)
      .eq("environment", environment!)
      .order("seen_at", { ascending: false })
      .order("package_id")
      .limit(101),
    supabaseAdmin
      .from("phase2_records")
      .select("resource_key,payload")
      .eq("kind", "sku_mapping")
      .limit(1001),
    supabaseAdmin.from("products").select('"SKU",name,barcode').order("id").limit(1001),
  ]);
  if (jobs.error || packages.error || mappings.error || catalog.error)
    return NextResponse.json(
      { error: "Yerel kayıtlar okunamadı; migration durumunu kontrol edin." },
      { status: 503, headers },
    );
  if ((mappings.data || []).length > 1000 || (catalog.data || []).length > 1000)
    return NextResponse.json(
      { error: "Eşleme kapasitesi aşıldı; eksik eşleme gösterilmedi." },
      { status: 503, headers },
    );
  const map = Object.fromEntries(
    (mappings.data || []).map((r) => [r.resource_key, r.payload.siteSku]),
  );
  return NextResponse.json(
    {
      jobs: jobs.data,
      packages: (packages.data || []).slice(0, 100),
      truncated: (packages.data || []).length > 100,
      mappings: map,
      products: catalog.data || [],
      environment,
    },
    { headers },
  );
}
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json(
      { error: "Yetkisiz erişim." },
      { status: 401, headers },
    );
  if (process.env.TRENDYOL_SYNC_ENABLED !== "1")
    return NextResponse.json(
      { error: "Senkronizasyon kapalı. Bağlantı kabulü sonrası açılacak.", disabled: true },
      { status: 503, headers },
    );
  try {
    const b = (await limitedJson(req, 1024)) as Record<string, unknown>;
    if (b.action === 'auto') {
      const result = await syncAutomaticPage({ db: supabaseAdmin, env: process.env,
        budget: (seller) => consumeRateLimit({ bucket: 'trendyol-sync-global', identifier: seller, maxRequests: 1, windowSeconds: 5 }) });
      return NextResponse.json(result.body, { status: result.status, headers: { ...headers, 'Retry-After': '5' } });
    }
    const seller = process.env.TRENDYOL_SELLER_ID || "",
      environment = process.env.TRENDYOL_ENVIRONMENT;
    if (
      !/^[1-9][0-9]{0,15}$/.test(seller) ||
      (environment !== "stage" && environment !== "production")
    )
      throw new Error("CONFIG");
    const budget = await consumeRateLimit({
      bucket: "trendyol-sync-global",
      identifier: seller,
      maxRequests: 1,
      windowSeconds: 5,
    });
    if (!budget.allowed)
      return NextResponse.json(
        { error: "Bir sonraki adım için en az 5 saniye bekleyin." },
        { status: 429, headers },
      );
    if (b.action === "start") {
      if (
        !Number.isSafeInteger(b.start) ||
        !Number.isSafeInteger(b.end) ||
        Number(b.end) > Date.now() + 60000 ||
        Number(b.start) < Date.now() - 89 * 86400000 ||
        Number(b.end) <= Number(b.start) ||
        Number(b.end) - Number(b.start) > 14 * 86400000
      )
        return NextResponse.json(
          { error: "Son 89 gün içinde en fazla 14 günlük aralık seçin." },
          { status: 400, headers },
        );
      const r = await supabaseAdmin.rpc("trendyol_begin_sync", {
        p_seller: seller,
        p_environment: environment,
        p_start: b.start,
        p_end: b.end,
      });
      if (r.error) throw r.error;
      return NextResponse.json({ jobId: r.data }, { headers });
    }
    if (
      b.action !== "step" ||
      typeof b.jobId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(b.jobId)
    )
      return NextResponse.json(
        { error: "Geçersiz işlem." },
        { status: 400, headers },
      );
    const r = await supabaseAdmin
      .from("trendyol_sync_jobs")
      .select("*")
      .eq("id", b.jobId)
      .eq("seller_id", seller)
      .eq("environment", environment)
      .maybeSingle();
    if (r.error || !r.data) throw new Error("JOB");
    const job = r.data;
    if (job.status === "complete")
      return NextResponse.json({ complete: true }, { headers });
    const page = await fetchTrendyolStream(
      {
        sellerId: seller,
        environment,
        apiKey: process.env.TRENDYOL_API_KEY || "",
        apiSecret: process.env.TRENDYOL_API_SECRET || "",
        buyerSecret: process.env.TRENDYOL_BUYER_HASH_SECRET,
      },
      {
        start: Number(job.starts_at),
        end: Number(job.ends_at),
        cursor: job.cursor_value,
      },
    );
    if(page.buyers){
      const buyers=await supabaseAdmin.rpc('trendyol_record_buyers',{p_seller:seller,p_environment:environment,p_buyers:page.buyers});
      if(buyers.error)throw buyers.error;
    }
    const saved = await supabaseAdmin.rpc("trendyol_apply_sync_page", {
      p_job: job.id,
      p_revision: job.revision,
      p_packages: page.packages,
      p_cursor: page.nextCursor,
      p_more: page.hasMore,
    });
    if (saved.error) throw saved.error;
    return NextResponse.json(
      {
        complete: !page.hasMore,
        count: page.packages.length,
        revision: saved.data,
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Adım doğrulanamadı. İş durumunu yenileyin; kaldığı yerden tekrar denenebilir. Cursor geçersizse aynı aralıkla yeni iş başlatın.",
      },
      { status: 503, headers },
    );
  }
}
