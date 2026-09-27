import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { returnState, visiblePackageStatus } from "@/lib/trendyol/return-status";
import type { projectPackages } from "@/lib/trendyol/packages";
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
  // A delivered package can later be refunded. Resolve return state before
  // filtering/paginating; filtering only the provider package status hides it.
  const [claims, settlements] = await Promise.all([
    supabaseAdmin.from("trendyol_claim_mirror").select("order_number,statuses").eq("seller_id", seller).eq("environment", environment!).limit(10001).abortSignal(AbortSignal.timeout(8000)),
    supabaseAdmin.from("trendyol_return_settlement_mirror").select("order_number").eq("seller_id", seller).eq("environment", environment!).limit(10001).abortSignal(AbortSignal.timeout(8000)),
  ]);
  if (claims.error || settlements.error || !claims.data || !settlements.data || claims.data.length > 10000 || settlements.data.length > 10000)
    return NextResponse.json(
      { error: "İade arşivi tam okunamadı; eksik sipariş listesi gösterilmedi." },
      { status: 503, headers },
    );
  const archive: { payload: ReturnType<typeof projectPackages>["packages"][number] }[] = [];
  for (let offset = 0; offset <= 10000; offset += 1000) {
    const result = await supabaseAdmin.from("trendyol_package_mirror")
      .select("payload", { count: "exact" }).eq("seller_id", seller).eq("environment", environment!)
      .order("package_id").range(offset, offset + 999).abortSignal(AbortSignal.timeout(8000));
    if (result.error || result.count === null || result.count > 10000 || !result.data || (!result.data.length && offset < result.count))
      return NextResponse.json({ error: "Sipariş arşivi tam okunamadı; eksik liste gösterilmedi." }, { status: 503, headers });
    archive.push(...result.data as typeof archive);
    if (archive.length >= result.count) break;
  }
  const needle = search.toLocaleLowerCase("tr-TR");
  const matching = archive.map(({ payload }) => {
    const orderNumber = String(payload.orderNumber || "");
    const refund = returnState(orderNumber, claims.data, settlements.data);
    return { ...payload, returnState: refund, displayStatus: visiblePackageStatus(String(payload.status || ""), refund) };
  }).filter(pkg => {
    const match = status === "all" || (status === "returns" ? pkg.returnState !== "none" || states.returns.includes(String(pkg.status)) : pkg.returnState === "none" && states[status]?.includes(String(pkg.status)));
    return match && (!needle || String(pkg.orderNumber).toLocaleLowerCase("tr-TR").includes(needle));
  }).sort((a,b) => Number(b.orderDate) - Number(a.orderDate) || String(a.packageId).localeCompare(String(b.packageId)));
  const packages = matching.slice(page * 50, page * 50 + 50);
  return NextResponse.json(
    {
      packages,
      page,
      total: matching.length,
      totalPages: Math.ceil(matching.length / 50),
      hasNext: (page + 1) * 50 < matching.length,
      syncEnabled: process.env.TRENDYOL_SYNC_ENABLED === "1",
      archived: true,
    },
    { headers },
  );
}
