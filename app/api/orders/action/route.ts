import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RefundError, refundOrder } from "@/lib/paytr/refundOrder";

export const runtime = "nodejs";

async function getAuthenticatedUserId(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await auth.auth.getUser(token);
  return error ? null : data.user?.id || null;
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId)
      return NextResponse.json(
        { error: "Oturum doğrulanamadı." },
        { status: 401 },
      );

    const body = (await req.json()) as {
      orderId?: unknown;
      action?: unknown;
      reason?: unknown;
      items?: unknown;
      evidenceUrls?: unknown;
    };
    const orderId = Number(body.orderId);
    if (
      !Number.isSafeInteger(orderId) ||
      orderId <= 0 ||
      !["cancel", "return"].includes(String(body.action))
    ) {
      return NextResponse.json(
        { error: "Geçersiz sipariş işlemi." },
        { status: 400 },
      );
    }

    if (body.action === "cancel") {
      const result = await refundOrder({
        orderId,
        newStatus: "İptal Edildi",
        customerUserId: userId,
      });
      return NextResponse.json({ success: true, ...result });
    }

    const reason = String(body.reason || "").trim().slice(0, 1000);
    if (reason.length < 5)
      return NextResponse.json(
        { error: "İade sebebi en az 5 karakter olmalıdır." },
        { status: 400 },
      );
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, items, status, created_at, delivered_at")
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("payment_status", "paid")
      .in("status", ["Teslim Edildi", "Tamamlandı"])
      .maybeSingle();
    if (orderError) throw new Error(orderError.message);
    if (!order)
      return NextResponse.json(
        { error: "Sipariş iade talebine uygun değil." },
        { status: 409 },
      );
    const deliveredAt = new Date(order.delivered_at || order.created_at).getTime();
    if (
      Date.now() - deliveredAt > 14 * 24 * 60 * 60 * 1000
    )
      return NextResponse.json(
        { error: "14 günlük iade talebi süresi dolmuş." },
        { status: 409 },
      );
    let orderItems: unknown[] = [];
    if (Array.isArray(order.items)) {
      orderItems = order.items;
    } else if (typeof order.items === "string") {
      try {
        const parsed = JSON.parse(order.items);
        orderItems = Array.isArray(parsed) ? parsed : [];
      } catch {
        orderItems = [];
      }
    }
    const requestedItems = Array.isArray(body.items) ? body.items : orderItems;
    const evidenceUrls = Array.isArray(body.evidenceUrls)
      ? body.evidenceUrls.slice(0, 3).map((value) => String(value))
      : [];
    const evidencePaths = evidenceUrls.map((value) => String(value || ""));
    const cleanupEvidence = async () => {
      const paths = evidencePaths.filter((path): path is string => Boolean(path));
      if (paths.length > 0)
        await supabaseAdmin.storage.from("return-evidence").remove(paths);
    };
    if (
      evidencePaths.some(
        (path) =>
          !path ||
          path.includes("..") ||
          !path.startsWith(`returns/${userId}/${orderId}/`),
      )
    )
      return NextResponse.json({ error: "İade görselleri geçersiz." }, { status: 400 });
    const aggregatedItems = new Map<
      string,
      { id: number; variant_id?: number; quantity: number }
    >();
    let invalidReturnItems = requestedItems.length === 0 || requestedItems.length > 100;
    for (const item of requestedItems.slice(0, 100)) {
      if (!item || typeof item !== "object") {
        invalidReturnItems = true;
        continue;
      }
      const row = item as Record<string, unknown>;
      const id = Number(row.id);
      const variantId = Number(row.variant_id || 0);
      const quantity = Number(row.quantity);
      if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        !Number.isSafeInteger(variantId) ||
        variantId < 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        invalidReturnItems = true;
        continue;
      }
      const key = `${id}:${variantId}`;
      const current = aggregatedItems.get(key);
      aggregatedItems.set(key, {
        id,
        ...(variantId > 0 ? { variant_id: variantId } : {}),
        quantity: (current?.quantity || 0) + quantity,
      });
    }
    const validItems = [...aggregatedItems.values()];
    for (const requested of validItems) {
      const orderedQuantity = orderItems.reduce<number>((total, candidate) => {
        if (!candidate || typeof candidate !== "object") return total;
        const source = candidate as Record<string, unknown>;
        if (
          Number(source.id) !== requested.id ||
          Number(source.variant_id || 0) !== Number(requested.variant_id || 0)
        )
          return total;
        const quantity = Number(source.quantity);
        return total + (Number.isInteger(quantity) && quantity > 0 ? quantity : 0);
      }, 0);
      if (orderedQuantity <= 0 || requested.quantity > orderedQuantity) {
        invalidReturnItems = true;
      }
    }
    if (invalidReturnItems || validItems.length === 0) {
      await cleanupEvidence();
      return NextResponse.json({ error: "İade ürünleri geçersiz." }, { status: 400 });
    }
    const { data: request, error: requestError } = await supabaseAdmin
      .from("return_requests")
      .insert({
        order_id: orderId,
        user_id: userId,
        reason,
        items: validItems,
        evidence_urls: evidenceUrls,
        original_order_status: order.status,
      })
      .select("id")
      .single();
    if (requestError?.code === "23505") {
      await cleanupEvidence();
      return NextResponse.json({ error: "Bu sipariş için zaten iade talebi var." }, { status: 409 });
    }
    if (requestError || !request) {
      await cleanupEvidence();
      throw new Error(requestError?.message || "İade talebi oluşturulamadı.");
    }
    const { data: updated, error } = await supabaseAdmin
      .from("orders")
      .update({ status: "İade Talebi" })
      .eq("id", orderId)
      .eq("user_id", userId)
      .select("id, status")
      .single();
    if (error) {
      await supabaseAdmin.from("return_requests").delete().eq("id", request.id);
      await cleanupEvidence();
      throw new Error(error.message);
    }
    return NextResponse.json({
      success: true,
      orderId,
      status: updated.status,
    });
  } catch (error) {
    const status = error instanceof RefundError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "Sipariş işlemi başarısız.";
    return NextResponse.json({ error: message }, { status });
  }
}
