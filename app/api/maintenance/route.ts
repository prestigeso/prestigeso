import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { comparePaytrStatus, queryPaytrStatus } from "@/lib/paytr/queryStatus";
import { cleanupStaleReturnEvidenceUploads } from "@/lib/returnEvidence";

export const runtime = "nodejs";

function safeEqual(input: string, expected: string) {
  const left = Buffer.from(input);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || "";
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (secret.length < 32 || !safeEqual(provided, secret))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });

  const [reservations, cleanup, staleEvidenceCleanup] = await Promise.all([
    supabaseAdmin.rpc("release_expired_stock_reservations"),
    supabaseAdmin.rpc("prune_operational_data"),
    cleanupStaleReturnEvidenceUploads(100).catch(() => null),
  ]);
  if (reservations.error || cleanup.error || staleEvidenceCleanup === null)
    return NextResponse.json({ error: "Bakım işlemi başarısız." }, { status: 500 });
  let reconciled = 0;
  if (
    process.env.PAYTR_MERCHANT_ID &&
    process.env.PAYTR_MERCHANT_KEY &&
    process.env.PAYTR_MERCHANT_SALT
  ) {
    const dueBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dueOrders } = await supabaseAdmin
      .from("orders")
      .select("id,merchant_oid,total_amount,refunded_amount")
      .in("payment_status", ["paid", "partially_refunded", "refunded"])
      .or(`last_reconciled_at.is.null,last_reconciled_at.lt.${dueBefore}`)
      .order("created_at", { ascending: false })
      .limit(5);
    const results = await Promise.all(
      (dueOrders || []).map(async (order) => {
        try {
          const remote = await queryPaytrStatus(String(order.merchant_oid));
          const comparison = comparePaytrStatus(
            Number(order.total_amount),
            Number(order.refunded_amount || 0),
            remote,
          );
          await supabaseAdmin
            .from("orders")
            .update({
              last_reconciled_at: new Date().toISOString(),
              reconciliation_status: comparison.status,
              reconciliation_detail: comparison.detail,
            })
            .eq("id", order.id);
          return true;
        } catch (error) {
          await supabaseAdmin
            .from("orders")
            .update({
              last_reconciled_at: new Date().toISOString(),
              reconciliation_status: "error",
              reconciliation_detail: {
                message:
                  error instanceof Error ? error.message.slice(0, 300) : "unknown",
              },
            })
            .eq("id", order.id);
          return false;
        }
      }),
    );
    reconciled = results.filter(Boolean).length;
  }
  return NextResponse.json({
    success: true,
    released: Number(reservations.data || 0),
    staleEvidenceDeleted: staleEvidenceCleanup,
    reconciled,
  });
}
