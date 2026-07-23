import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

function rpcErrorMessage(
  operation: string,
  error: { message?: string } | null,
) {
  return `${operation}: ${error?.message || "bilinmeyen veritabanı hatası"}`;
}

export async function reserveOrderStock(orderId: number) {
  const { error } = await supabaseAdmin.rpc("reserve_order_stock", {
    p_order_id: orderId,
  });

  if (error) throw new Error(rpcErrorMessage("Stok rezerve edilemedi", error));
}

export async function releaseOrderStock(orderId: number) {
  const [stockResult, couponResult] = await Promise.all([
    supabaseAdmin.rpc("release_order_stock", { p_order_id: orderId }),
    supabaseAdmin.rpc("release_order_coupon_reservation", {
      p_order_id: orderId,
    }),
  ]);

  if (stockResult.error)
    throw new Error(rpcErrorMessage("Stok iade edilemedi", stockResult.error));
  if (couponResult.error)
    throw new Error(
      rpcErrorMessage("Kupon rezervasyonu bırakılamadı", couponResult.error),
    );
}

export async function reserveOrderCoupon({
  couponId,
  userId,
  orderId,
  couponCode,
  discountAmount,
}: {
  couponId: string;
  userId: string;
  orderId: number;
  couponCode: string;
  discountAmount: number;
}) {
  const { data, error } = await supabaseAdmin.rpc("reserve_order_coupon", {
    p_coupon_id: couponId,
    p_user_id: userId,
    p_order_id: orderId,
    p_coupon_code: couponCode,
    p_discount_amount: discountAmount,
  });
  if (error || data !== true)
    throw new Error(rpcErrorMessage("Kupon rezerve edilemedi", error));
}

export async function releaseExpiredReservations() {
  const { error } = await supabaseAdmin.rpc(
    "release_expired_stock_reservations",
  );
  if (error)
    console.error(
      "Süresi dolan stok rezervasyonları temizlenemedi:",
      error.message,
    );
}

export async function claimPostPaymentProcessing(orderId: number) {
  const { data, error } = await supabaseAdmin.rpc("claim_order_post_payment", {
    p_order_id: orderId,
  });

  if (error)
    throw new Error(
      rpcErrorMessage("Ödeme sonrası işlemler kilitlenemedi", error),
    );
  return data === true;
}

export async function finishPostPaymentProcessing(
  orderId: number,
  success: boolean,
) {
  const { error } = await supabaseAdmin.rpc("finish_order_post_payment", {
    p_order_id: orderId,
    p_success: success,
  });

  if (error)
    throw new Error(
      rpcErrorMessage("Ödeme sonrası işlem durumu kaydedilemedi", error),
    );
}
