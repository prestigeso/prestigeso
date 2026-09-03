import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RefundError, refundOrder } from "@/lib/paytr/refundOrder";
import { releaseReturnEvidenceUploads } from "@/lib/returnEvidence";

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
  let cleanupPendingEvidence: (() => Promise<void>) | null = null;
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
    const action = String(body.action || "");
    const rawEvidencePaths = Array.isArray(body.evidenceUrls)
      ? body.evidenceUrls.map((value) =>
          typeof value === "string" ? value : "",
        )
      : [];
    const ownedEvidencePaths = [
      ...new Set(
        rawEvidencePaths.filter(
          (path) =>
            Number.isSafeInteger(orderId) &&
            orderId > 0 &&
            path.length <= 500 &&
            !path.includes("..") &&
            path.startsWith(`returns/${userId}/${orderId}/`),
        ),
      ),
    ].slice(0, 3);
    cleanupPendingEvidence = async () => {
      if (ownedEvidencePaths.length === 0) return;
      await releaseReturnEvidenceUploads({
        orderId,
        userId,
        paths: ownedEvidencePaths,
      }).catch(() => undefined);
    };
    if (
      !Number.isSafeInteger(orderId) ||
      orderId <= 0 ||
      !["cancel", "return"].includes(action)
    ) {
      await cleanupPendingEvidence();
      return NextResponse.json(
        { error: "Geçersiz sipariş işlemi." },
        { status: 400 },
      );
    }

    if (action === "cancel") {
      cleanupPendingEvidence = null;
      const result = await refundOrder({
        orderId,
        newStatus: "İptal Edildi",
        customerUserId: userId,
      });
      return NextResponse.json({ success: true, ...result });
    }

    const reason = String(body.reason || "").trim().slice(0, 1000);
    if (reason.length < 5) {
      await cleanupPendingEvidence();
      return NextResponse.json(
        { error: "İade sebebi en az 5 karakter olmalıdır." },
        { status: 400 },
      );
    }
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, items, status, created_at, delivered_at")
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("payment_status", "paid")
      .in("status", ["Teslim Edildi", "Tamamlandı"])
      .maybeSingle();
    if (orderError) {
      await cleanupPendingEvidence();
      return NextResponse.json(
        { error: "İade talebi için sipariş doğrulanamadı." },
        { status: 500 },
      );
    }
    if (!order) {
      await cleanupPendingEvidence();
      return NextResponse.json(
        { error: "Sipariş iade talebine uygun değil." },
        { status: 409 },
      );
    }
    const deliveredAt = new Date(order.delivered_at || order.created_at).getTime();
    if (
      Date.now() - deliveredAt > 14 * 24 * 60 * 60 * 1000
    ) {
      await cleanupPendingEvidence();
      return NextResponse.json(
        { error: "14 günlük iade talebi süresi dolmuş." },
        { status: 409 },
      );
    }
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
    const evidencePaths = rawEvidencePaths;
    if (
      evidencePaths.length > 3 ||
      new Set(evidencePaths).size !== evidencePaths.length ||
      evidencePaths.some(
        (path) =>
          !path ||
          path.length > 500 ||
          path.includes("..") ||
          !path.startsWith(`returns/${userId}/${orderId}/`),
      )
    ) {
      await cleanupPendingEvidence();
      return NextResponse.json({ error: "İade görselleri geçersiz." }, { status: 400 });
    }
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
      await cleanupPendingEvidence();
      return NextResponse.json({ error: "İade ürünleri geçersiz." }, { status: 400 });
    }
    const { error: requestError } = await supabaseAdmin.rpc(
      "create_return_request_with_evidence",
      {
        p_order_id: orderId,
        p_user_id: userId,
        p_reason: reason,
        p_items: validItems,
        p_evidence_paths: evidencePaths,
      },
    );
    if (requestError) {
      await cleanupPendingEvidence();
      const conflict =
        requestError.code === "23505" ||
        /RETURN_REQUEST_EXISTS|RETURN_EVIDENCE_INVALID|ORDER_NOT_RETURNABLE/.test(
          requestError.message,
        );
      return NextResponse.json(
        {
          error: conflict
            ? "Bu sipariş için iade talebi oluşturulamıyor."
            : "İade talebi oluşturulamadı.",
        },
        { status: conflict ? 409 : 500 },
      );
    }
    cleanupPendingEvidence = null;
    return NextResponse.json({
      success: true,
      orderId,
      status: "İade Talebi",
    });
  } catch (error) {
    if (cleanupPendingEvidence) await cleanupPendingEvidence();
    if (error instanceof RefundError) {
      const status = [400, 404, 409, 502].includes(error.status)
        ? error.status
        : 500;
      const message =
        status === 404
          ? "Sipariş bulunamadı."
          : status === 409
            ? "Sipariş bu aşamada iptal edilemiyor veya işlem devam ediyor."
            : status === 502
              ? "Ödeme sağlayıcısıyla iletişim kurulamadı."
              : "Sipariş iptal işlemi tamamlanamadı.";
      return NextResponse.json({ error: message }, { status });
    }
    return NextResponse.json(
      { error: "Sipariş işlemi başarısız." },
      { status: 500 },
    );
  }
}
