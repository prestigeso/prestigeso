import crypto from "crypto";
import { logServerEvent } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { comparePaytrStatus, queryPaytrStatus } from "@/lib/paytr/queryStatus";
import { cleanupStaleReturnEvidenceUploads } from "@/lib/returnEvidence";
import { dispatchPendingTransactionEmails } from "@/lib/email/transactionalOutbox";

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
  let reconciliationFailures = 0;
  if (
    process.env.PAYTR_MERCHANT_ID &&
    process.env.PAYTR_MERCHANT_KEY &&
    process.env.PAYTR_MERCHANT_SALT
  ) {
    const dueBefore = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const selectDue = (statuses: string[], limit: number) => supabaseAdmin.from("orders")
      .select("id,merchant_oid,total_amount,refunded_amount,payment_status,paytr_total_amount,payment_recovery_status")
      .in("payment_status", statuses).not("merchant_oid", "is", null)
      .or(`last_reconciled_at.is.null,last_reconciled_at.lt.${dueBefore}`)
      .order("last_reconciled_at", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true }).limit(limit);
    // Keep a reserved share for unresolved/expired attempts: a large historical
    // paid-order backlog must not exclude late successful payments indefinitely.
    const [ambiguous, settled] = await Promise.all([
      selectDue(["pending", "failed"], 3), selectDue(["paid", "partially_refunded", "refunded"], 2),
    ]);
    if (ambiguous.error || settled.error) return NextResponse.json({ error: "Mutabakat kuyruğu okunamadı." }, { status: 500 });
    const dueOrders = [...(ambiguous.data || []), ...(settled.data || [])];
    const results = await Promise.all(
      (dueOrders || []).map(async (order) => {
        try {
          const remote = await queryPaytrStatus(String(order.merchant_oid));
          const comparison = comparePaytrStatus(
            Number(order.total_amount),
            Number(order.refunded_amount || 0),
            remote,
          );
          if (["pending", "failed"].includes(order.payment_status) && comparison.canRecoverPayment) {
            const { error: recoveryError } = await supabaseAdmin.rpc("record_verified_paytr_result", {
              p_merchant_oid: order.merchant_oid, p_status: "success", p_total_amount: Number(order.paytr_total_amount),
              p_source: "status_query", p_failure_reason: null,
            });
            if (recoveryError) throw new Error("Verified payment recovery not recorded");
          }
          const { error: reconciliationError } = await supabaseAdmin
            .from("orders")
            .update({
              last_reconciled_at: new Date().toISOString(),
              reconciliation_status: comparison.status,
              reconciliation_detail: comparison.detail,
            })
            .eq("id", order.id)
            .neq("payment_recovery_status", "manual_review");
          if (reconciliationError) throw new Error("Payment reconciliation not recorded");
          // A manual-review order must keep its exception detail, but still move
          // to the back of the reconciliation queue instead of starving others.
          const { error: checkedAtError } = await supabaseAdmin.from("orders")
            .update({ last_reconciled_at: new Date().toISOString() }).eq("id", order.id);
          if (checkedAtError) throw new Error("Payment reconciliation timestamp not recorded");
          if (comparison.status === "mismatch") {
            const { error: issueError } = await supabaseAdmin.from("payment_recovery_exceptions").upsert({
              order_id: order.id, kind: "provider_status_mismatch", reason_code: "payment_or_refund_mismatch",
              confirmed_amount: Number(order.paytr_total_amount), source: "status_query", last_seen_at: new Date().toISOString(),
              status: "open", resolved_at: null,
            }, { onConflict: "order_id,kind" });
            if (issueError) throw new Error("Payment mismatch exception not recorded");
          } else {
            const { error: resolvedError } = await supabaseAdmin.from("payment_recovery_exceptions").update({ status: "resolved", resolved_at: new Date().toISOString() })
              .eq("order_id", order.id).eq("kind", "provider_status_mismatch").eq("status", "open");
            if (resolvedError) throw new Error("Payment exception resolution not recorded");
          }
          return true;
        } catch (error) {
          logServerEvent("error", "maintenance_reconciliation_failed", { orderId: order.id, error });
          await supabaseAdmin
            .from("orders")
            .update({
              last_reconciled_at: new Date().toISOString(),
              reconciliation_status: "error",
              reconciliation_detail: {
                message: "RECONCILIATION_FAILED",
              },
            })
            .eq("id", order.id)
            .neq("payment_recovery_status", "manual_review");
          await supabaseAdmin.from("orders").update({ last_reconciled_at: new Date().toISOString() }).eq("id", order.id);
          return false;
        }
      }),
    );
    reconciled = results.filter(Boolean).length;
    reconciliationFailures = results.length - reconciled;
  }
  let emails;
  try { emails = await dispatchPendingTransactionEmails(10); }
  catch { return NextResponse.json({ error: "E-posta kuyruğu işlenemedi.", reconciled }, { status: 500 }); }
  return NextResponse.json({
    success: reconciliationFailures === 0,
    released: Number(reservations.data || 0),
    staleEvidenceDeleted: staleEvidenceCleanup,
    reconciled,
    reconciliationFailures,
    emails,
  }, { status: reconciliationFailures > 0 ? 503 : 200 });
}
