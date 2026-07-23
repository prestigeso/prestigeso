import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RefundError, refundOrder } from "@/lib/paytr/refundOrder";

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

    if (decision === "reject") {
      const { error } = await supabaseAdmin
        .from("return_requests")
        .update({ status: "rejected", admin_note: note, decided_at: new Date().toISOString() })
        .eq("id", request.id)
        .eq("status", "pending");
      if (error) throw new Error(error.message);
      await supabaseAdmin
        .from("orders")
        .update({ status: request.original_order_status })
        .eq("id", orderId)
        .eq("status", "İade Talebi");
      return NextResponse.json({ success: true, status: request.original_order_status });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("items, total_amount")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error(orderError?.message || "Sipariş bulunamadı.");
    const orderItems = Array.isArray(order.items) ? order.items : [];
    const returnItems = Array.isArray(request.items) ? request.items : [];
    const lineTotal = (items: unknown[]) =>
      items.reduce<number>((sum, value) => {
        if (!value || typeof value !== "object") return sum;
        const item = value as Record<string, unknown>;
        const price = Number(item.price || item.discount_price || 0);
        const quantity = Number(item.quantity || 0);
        return sum + (Number.isFinite(price) ? price : 0) * (Number.isFinite(quantity) ? quantity : 0);
      }, 0);
    const fullSubtotal = lineTotal(orderItems);
    const returnSubtotal = lineTotal(
      returnItems.map((value) => {
        const requested = value as Record<string, unknown>;
        const source = orderItems.find(
          (item) =>
            item &&
            typeof item === "object" &&
            Number((item as Record<string, unknown>).id) === Number(requested.id) &&
            Number((item as Record<string, unknown>).variant_id || 0) ===
              Number(requested.variant_id || 0),
        ) as Record<string, unknown> | undefined;
        return { ...source, quantity: requested.quantity };
      }),
    );
    if (fullSubtotal <= 0 || returnSubtotal <= 0)
      throw new Error("İade satır tutarı hesaplanamadı.");
    const refundAmount =
      returnSubtotal >= fullSubtotal - 0.001
        ? Number(order.total_amount)
        : Math.round(Number(order.total_amount) * (returnSubtotal / fullSubtotal) * 100) / 100;
    const { error: approveError } = await supabaseAdmin
      .from("return_requests")
      .update({
        status: "approved",
        admin_note: note,
        return_shipping_code: returnShippingCode,
        decided_at: new Date().toISOString(),
      })
      .eq("id", request.id)
      .eq("status", "pending");
    if (approveError) throw new Error(approveError.message);
    try {
      const refund = await refundOrder({
        orderId,
        newStatus: "İade Edildi",
        refundAmount,
        returnRequestId: Number(request.id),
      });
      const { error: completeError } = await supabaseAdmin
        .from("return_requests")
        .update({ status: "completed", refund_amount: refundAmount })
        .eq("id", request.id);
      if (completeError) throw new Error(completeError.message);
      return NextResponse.json({
        success: true,
        status: refund.status,
        refundAmount,
      });
    } catch (error) {
      const paymentMayHaveCompleted =
        error instanceof Error &&
        /tamamland[ıi]|manuel mutabakat|stoğu geri yazılamadı/i.test(error.message);
      if (!paymentMayHaveCompleted)
        await supabaseAdmin
          .from("return_requests")
          .update({ status: "pending", decided_at: null })
          .eq("id", request.id)
          .eq("status", "approved");
      throw error;
    }
  } catch (error) {
    const status = error instanceof RefundError ? error.status : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "İade kararı uygulanamadı." },
      { status },
    );
  }
}
