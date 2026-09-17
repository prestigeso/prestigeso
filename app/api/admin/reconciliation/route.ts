import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { comparePaytrStatus, queryPaytrStatus } from "@/lib/paytr/queryStatus";
import { logServerEvent } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  try {
    const body = (await req.json()) as { orderId?: unknown };
    const orderId = Number(body.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0)
      return NextResponse.json({ error: "Geçersiz sipariş." }, { status: 400 });
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id,merchant_oid,total_amount,refunded_amount")
      .eq("id", orderId)
      .single();
    if (error || !order) throw new Error(error?.message || "Sipariş bulunamadı.");
    const remote = await queryPaytrStatus(String(order.merchant_oid));
    const comparison = comparePaytrStatus(
      Number(order.total_amount),
      Number(order.refunded_amount || 0),
      remote,
    );
    const persisted = await supabaseAdmin
      .from("orders")
      .update({
        last_reconciled_at: new Date().toISOString(),
        reconciliation_status: comparison.status,
        reconciliation_detail: comparison.detail,
      })
      .eq("id", order.id)
      .select("id")
      .maybeSingle();
    if (persisted.error || !persisted.data) {
      logServerEvent("error", "reconciliation_record_failed", { orderId: order.id, error: persisted.error });
      return NextResponse.json(
        { error: "PayTR karşılaştırması yapıldı ancak mutabakat kaydı saklanamadı. Sipariş çözülmüş olarak değerlendirilmemeli; yeniden kontrol edin." },
        { status: 500 },
      );
    }
    return NextResponse.json(comparison);
  } catch (error) {
    logServerEvent("error", "reconciliation_failed", { error });
    return NextResponse.json(
      { error: "Mutabakat doğrulanamadı. Sipariş çözülmüş olarak değerlendirilmemeli; işlem kaydını kontrol edin." },
      { status: 502 },
    );
  }
}
