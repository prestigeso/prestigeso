import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RefundError, refundOrder } from "@/lib/paytr/refundOrder";
import { ReturnDecisionError, runReturnDecision } from "@/lib/returns/returnDecision";
import { calculateReturnRefundAmount } from "@/lib/returns/refundAmount";

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
    };
    const orderId = Number(body.orderId);
    const decision = String(body.decision);
    const note = String(body.note || "").trim().slice(0, 1000) || null;
    const returnShippingCode =
      String(body.returnShippingCode || "").trim().slice(0, 100) || null;
    if (!Number.isSafeInteger(orderId) || !["approve", "reject"].includes(decision))
      return NextResponse.json({ error: "Geçersiz iade kararı." }, { status: 400 });

    const { data: request, error: requestError } = await supabaseAdmin
      .from("return_requests")
      .select("id, original_order_status, status, items")
      .eq("order_id", orderId)
      .eq("status", "pending")
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request)
      return NextResponse.json({ error: "Bekleyen iade talebi bulunamadı." }, { status: 409 });

    const decidedAt = new Date().toISOString();
    if (decision === "reject") {
      await runReturnDecision({
        claim: () => supabaseAdmin
          .from("return_requests")
          .update({ status: "rejected", admin_note: note, decided_at: decidedAt })
          .eq("id", request.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle(),
        perform: async () => {
          const restored = await supabaseAdmin
            .from("orders")
            .update({ status: request.original_order_status })
            .eq("id", orderId)
            .eq("status", "İade Talebi")
            .select("id")
            .maybeSingle();
          if (restored.error || !restored.data)
            throw new ReturnDecisionError(
              "İade talebi reddedildi ancak sipariş durumu güncellenemedi. Manuel kontrol gerekiyor.",
              500,
            );
        },
        canRetry: () => false,
      });
      return NextResponse.json({ success: true, status: request.original_order_status });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("items, total_amount")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error(orderError?.message || "Sipariş bulunamadı.");
    const refundAmount = calculateReturnRefundAmount({
      orderItems: order.items,
      returnItems: request.items,
      totalAmount: order.total_amount,
    });
    const refund = await runReturnDecision({
      claim: () => supabaseAdmin
        .from("return_requests")
        .update({
          status: "approved",
          admin_note: note,
          return_shipping_code: returnShippingCode,
          decided_at: decidedAt,
        })
        .eq("id", request.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle(),
      perform: () => refundOrder({
        orderId,
        newStatus: "İade Edildi",
        refundAmount,
        returnRequestId: Number(request.id),
      }),
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
