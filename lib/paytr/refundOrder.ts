import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { releaseOrderStock } from "@/lib/orderInventory";
import { createPaytrRefundToken } from "@/lib/paytr/signatures";

export class RefundError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

type RefundStatus = "İptal Edildi" | "İade Edildi";

export async function refundOrder({
  orderId,
  newStatus,
  customerUserId,
  refundAmount,
  returnRequestId,
}: {
  orderId: number;
  newStatus: RefundStatus;
  customerUserId?: string;
  refundAmount?: number;
  returnRequestId?: number;
}) {
  let query = supabaseAdmin
    .from("orders")
    .select(
      "id, user_id, merchant_oid, total_amount, refunded_amount, payment_status, status, refund_started_at",
    )
    .eq("id", orderId);
  if (customerUserId) query = query.eq("user_id", customerUserId);

  const { data: order, error: orderError } = await query.maybeSingle();
  if (orderError)
    throw new RefundError(`Sipariş okunamadı: ${orderError.message}`, 500);
  if (!order) throw new RefundError("Sipariş bulunamadı.", 404);

  if (order.payment_status === "refunded") {
    await releaseOrderStock(Number(order.id));
    return {
      orderId: Number(order.id),
      status: order.status,
      alreadyRefunded: true,
    };
  }
  if (!["paid", "partially_refunded"].includes(String(order.payment_status)))
    throw new RefundError("Ödenmemiş sipariş için iade yapılamaz.", 400);
  if (order.payment_status === "partially_refunded" && !returnRequestId)
    throw new RefundError(
      "Kısmi iadesi bulunan sipariş yalnızca kayıtlı iade talebi üzerinden tamamlanabilir.",
      409,
    );

  const paidAmount = Number(order.total_amount || 0);
  const previouslyRefunded = Number(order.refunded_amount || 0);
  const remainingAmount = Math.max(0, paidAmount - previouslyRefunded);
  const requestedRefund =
    refundAmount == null ? remainingAmount : Math.round(Number(refundAmount) * 100) / 100;
  if (
    !Number.isFinite(requestedRefund) ||
    requestedRefund <= 0 ||
    requestedRefund > remainingAmount + 0.001
  )
    throw new RefundError("İade tutarı geçersiz.", 400);

  if (customerUserId) {
    const cancellableStatuses = new Set([
      "Bekliyor",
      "İşleniyor",
      "Hazırlanıyor",
    ]);
    if (
      newStatus !== "İptal Edildi" ||
      !cancellableStatuses.has(String(order.status))
    ) {
      throw new RefundError(
        "Sipariş bu aşamada müşteri tarafından iptal edilemez.",
        409,
      );
    }
  }

  if (order.refund_started_at)
    throw new RefundError(
      "Bu sipariş için iade işlemi zaten devam ediyor.",
      409,
    );

  const startedAt = new Date().toISOString();
  let claim = supabaseAdmin
    .from("orders")
    .update({ refund_started_at: startedAt })
    .eq("id", order.id)
    .in("payment_status", ["paid", "partially_refunded"])
    .is("refund_started_at", null);
  if (customerUserId) claim = claim.eq("user_id", customerUserId);
  const { data: claimed, error: claimError } = await claim
    .select("id")
    .maybeSingle();
  if (claimError)
    throw new RefundError(
      `İade işlemi kilitlenemedi: ${claimError.message}`,
      500,
    );
  if (!claimed)
    throw new RefundError(
      "Bu sipariş için başka bir iade işlemi devam ediyor.",
      409,
    );

  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantId || !merchantKey || !merchantSalt) {
    await supabaseAdmin
      .from("orders")
      .update({ refund_started_at: null })
      .eq("id", order.id);
    throw new RefundError("PayTR ayarları eksik.", 500);
  }

  const merchantOid = String(order.merchant_oid || "");
  const returnAmount = requestedRefund.toFixed(2);
  const paytrToken = createPaytrRefundToken({
    merchantId,
    merchantOid,
    returnAmount,
    merchantSalt,
    merchantKey,
  });
  const params = new URLSearchParams({
    merchant_id: merchantId,
    merchant_oid: merchantOid,
    return_amount: returnAmount,
    paytr_token: paytrToken,
  });

  let paytrResult: Record<string, unknown>;
  try {
    const response = await fetch("https://www.paytr.com/odeme/iade", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const text = await response.text();
    paytrResult = JSON.parse(text) as Record<string, unknown>;
  } catch (error) {
    await supabaseAdmin
      .from("orders")
      .update({ refund_started_at: null })
      .eq("id", order.id);
    const message =
      error instanceof Error ? error.message : "Geçersiz PayTR yanıtı";
    throw new RefundError(`PayTR iade yanıtı alınamadı: ${message}`, 502);
  }

  if (paytrResult.status !== "success") {
    await supabaseAdmin
      .from("orders")
      .update({ refund_started_at: null })
      .eq("id", order.id);
    throw new RefundError(
      `PayTR iade işlemi başarısız: ${String(paytrResult.err_msg || "Bilinmeyen hata")}`,
      400,
    );
  }

  const cumulativeRefund = Math.round((previouslyRefunded + requestedRefund) * 100) / 100;
  const fullyRefunded = cumulativeRefund >= paidAmount - 0.001;
  const finalStatus = fullyRefunded ? newStatus : "Kısmi İade";
  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({
      status: finalStatus,
      payment_status: fullyRefunded ? "refunded" : "partially_refunded",
      refunded_amount: cumulativeRefund,
      refunded_at: new Date().toISOString(),
      refund_started_at: null,
    })
    .eq("id", order.id)
    .eq("refund_started_at", startedAt);
  if (updateError) {
    throw new RefundError(
      "PayTR iadesi tamamlandı fakat sipariş durumu kaydedilemedi; manuel mutabakat gerekiyor.",
      500,
    );
  }

  if (returnRequestId) {
    const { error: stockError } = await supabaseAdmin.rpc(
      "release_return_request_stock",
      { p_return_request_id: returnRequestId },
    );
    if (stockError)
      throw new RefundError(
        "Ödeme iadesi tamamlandı fakat seçilen ürünlerin stoğu geri yazılamadı; manuel mutabakat gerekiyor.",
        500,
      );
    if (fullyRefunded)
      await supabaseAdmin
        .from("orders")
        .update({ stock_released_at: new Date().toISOString() })
        .eq("id", order.id)
        .is("stock_released_at", null);
  } else if (fullyRefunded) {
    await releaseOrderStock(Number(order.id));
  }
  return {
    orderId: Number(order.id),
    status: finalStatus,
    refundAmount: requestedRefund,
    fullyRefunded,
    alreadyRefunded: false,
  };
}
