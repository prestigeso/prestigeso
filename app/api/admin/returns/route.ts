import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RefundError, refundOrder } from "@/lib/paytr/refundOrder";
import { ReturnDecisionError, runReturnDecision } from "@/lib/returns/returnDecision";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const limit = 50;
  const from = (page - 1) * limit;
  const { data, error, count } = await supabaseAdmin
    .from("return_requests")
    .select("*, orders(order_no,user_email,status,total_amount)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);
  if (error)
    return NextResponse.json({ error: "İade talepleri yüklenemedi." }, { status: 500 });
  return NextResponse.json({ data: data || [], page, limit, total: count || 0 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  try {
    const body = (await req.json()) as {
      orderId?: unknown;
      decision?: unknown;
      note?: unknown;
      returnShippingCode?: unknown;
      requestId?: unknown;
      expectedRefundAmount?: unknown;
    };
    const orderId = Number(body.orderId);
    const decision = String(body.decision);
    const requestId = Number(body.requestId);
    const expectedRefundAmount = Number(body.expectedRefundAmount);
    const note = String(body.note || "").trim().slice(0, 1000) || null;
    const returnShippingCode =
      String(body.returnShippingCode || "").trim().slice(0, 100) || null;
    if (!Number.isSafeInteger(orderId) || orderId <= 0 ||
      !Number.isSafeInteger(requestId) || requestId <= 0 || !["approve", "reject"].includes(decision) ||
      (decision === "approve" && (!Number.isFinite(expectedRefundAmount) || expectedRefundAmount <= 0)))
      return NextResponse.json({ error: "Geçersiz iade kararı." }, { status: 400 });

    const { data: request, error: requestError } = await supabaseAdmin
      .from("return_requests")
      .select("id, original_order_status, status, items")
      .eq("order_id", orderId)
      .eq("id", requestId)
      .eq("status", "pending")
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request)
      return NextResponse.json({ error: "Bekleyen iade talebi bulunamadı." }, { status: 409 });

    const decidedAt = new Date().toISOString();
    if (decision === "reject") {
      await runReturnDecision({
        claim: () => supabaseAdmin.rpc("decide_return_request", {
          p_request_id: requestId, p_decision: "reject", p_decided_at: decidedAt, p_note: note,
        }),
        // Rejection and restoration happen atomically under the same order lock.
        perform: async () => undefined,
        canRetry: () => false,
      });
      return NextResponse.json({ success: true, status: request.original_order_status });
    }

    let refundAmount = 0;
    const refund = await runReturnDecision({
      claim: async () => {
        const result = await supabaseAdmin.rpc("decide_return_request", {
          p_request_id: requestId, p_decision: "approve", p_decided_at: decidedAt,
          p_note: note, p_shipping_code: returnShippingCode,
        });
        refundAmount = Number(result.data?.refund_amount);
        return result;
      },
      perform: () => {
        if (!Number.isFinite(refundAmount) || refundAmount <= 0 ||
          Math.round(refundAmount * 100) !== Math.round(expectedRefundAmount * 100))
          throw new RefundError("İade tutarı değişti. Listeyi yenileyip güncel tutarı yeniden onaylayın.", 409, true);
        return refundOrder({ orderId, newStatus: "İade Edildi", refundAmount, returnRequestId: requestId });
      },
      complete: () => supabaseAdmin
        .from("return_requests")
        .update({ status: "completed", refund_amount: refundAmount })
        .eq("id", request.id)
        .eq("status", "approved")
        .eq("decided_at", decidedAt)
        .select("id")
        .maybeSingle(),
      reset: () => supabaseAdmin
        .from("return_requests")
        .update({ status: "pending", decided_at: null })
        .eq("id", request.id)
        .eq("status", "approved")
        .eq("decided_at", decidedAt)
        .select("id")
        .maybeSingle(),
      canRetry: (error) => error instanceof RefundError && error.retrySafe,
    });
    return NextResponse.json({
      success: true,
      status: refund.status,
      refundAmount,
    });
  } catch (error) {
    const status =
      error instanceof RefundError || error instanceof ReturnDecisionError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "İade kararı uygulanamadı." },
      { status },
    );
  }
}
