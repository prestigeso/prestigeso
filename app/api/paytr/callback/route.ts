import type { ReactElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  claimPostPaymentProcessing,
  finishPostPaymentProcessing,
  releaseOrderStock,
  reserveOrderStock,
} from "@/lib/orderInventory";
import {
  createOrderTrackingToken,
  createPaytrCallbackHash,
  verifyPaytrCallbackHash,
} from "@/lib/paytr/signatures";

export const runtime = "nodejs";

type OrderItem = {
  id?: number | string;
  name?: string;
  price?: number | string;
  quantity?: number | string;
  image?: string;
  images?: string[];
};

type JsonObject = Record<string, unknown>;

function safeParseItems(value: unknown): OrderItem[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? (parsed as OrderItem[]) : [];
  } catch {
    return [];
  }
}

function safeParseObject(value: unknown): JsonObject | null {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as JsonObject)
      : null;
  } catch {
    return null;
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

async function registerCouponUsage(order: Record<string, unknown>) {
  const shippingAddress = safeParseObject(order.shipping_address);
  const coupon = safeParseObject(shippingAddress?.coupon);
  const couponId = coupon?.id;
  const couponCode = order.coupon_code || coupon?.code;
  const userId = order.user_id;
  const discountAmount = Number(
    order.coupon_discount_amount || coupon?.discount_amount || 0,
  );

  if (
    !couponId ||
    !couponCode ||
    !userId ||
    !Number.isFinite(discountAmount) ||
    discountAmount <= 0
  ) {
    return;
  }

  const { error } = await supabaseAdmin.rpc("register_order_coupon_usage", {
    p_coupon_id: String(couponId),
    p_user_id: String(userId),
    p_order_id: Number(order.id),
    p_coupon_code: String(couponCode).toUpperCase(),
    p_discount_amount: discountAmount,
  });
  if (error) throw new Error(`Kupon kullanımı kaydedilemedi: ${error.message}`);
}

async function sendConfirmationEmail(
  order: Record<string, unknown>,
  callbackTotal: number,
  trackingUrl?: string,
) {
  if (!process.env.RESEND_API_KEY) return;

  const shipping = safeParseObject(order.shipping_address);
  const email = String(shipping?.email || order.user_email || "")
    .trim()
    .toLowerCase();
  if (
    !isValidEmail(email) ||
    (email.startsWith("guest-") && email.endsWith("@prestigeso.com.tr"))
  )
    return;

  const firstName = String(shipping?.firstName || "").trim();
  const lastName = String(shipping?.lastName || "").trim();
  const customerName = `${firstName} ${lastName}`.trim() || "Müşterimiz";
  const items = safeParseItems(order.items).filter((item) => {
    const quantity = Number(item.quantity);
    return item.id && Number.isSafeInteger(quantity) && quantity > 0;
  });

  const { Resend } = await import("resend");
  const { OrderConfirmation } =
    await import("@/components/emails/OrderConfirmation");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "info@prestigeso.com.tr";
  const result = await resend.emails.send({
    from: `PrestigeSO <${fromEmail}>`,
    to: [email],
    subject: `Siparişiniz Alındı (${String(order.id)}) - PrestigeSO`,
    react: OrderConfirmation({
      orderId: String(order.id),
      customerName,
      items,
      totalAmount: callbackTotal / 100,
      trackingUrl,
    }) as ReactElement,
  });

  if (result.error)
    throw new Error(`Sipariş e-postası gönderilemedi: ${result.error.message}`);
}

export async function POST(req: NextRequest) {
  try {
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
    if (!merchantKey || !merchantSalt)
      return new NextResponse("PAYTR ENV ERROR", { status: 500 });

    const formData = await req.formData();
    const merchantOid = String(formData.get("merchant_oid") || "");
    const status = String(formData.get("status") || "");
    const totalAmountText = String(formData.get("total_amount") || "");
    const hash = String(formData.get("hash") || "");
    const failedReasonMsg = String(
      formData.get("failed_reason_msg") || "",
    ).slice(0, 500);
    const callbackTotal = Number(totalAmountText);

    if (
      !merchantOid ||
      !["success", "failed"].includes(status) ||
      !Number.isSafeInteger(callbackTotal) ||
      callbackTotal <= 0
    ) {
      return new NextResponse("PAYTR notification failed: invalid payload", {
        status: 400,
      });
    }

    const checkHash = createPaytrCallbackHash({
      merchantOid,
      merchantSalt,
      status: status as "success" | "failed",
      totalAmount: totalAmountText,
      merchantKey,
    });
    if (!verifyPaytrCallbackHash(checkHash, hash)) {
      return new NextResponse("PAYTR notification failed: bad hash", {
        status: 400,
      });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select(
        "id, user_id, user_email, payment_status, items, shipping_address, paytr_total_amount, coupon_code, coupon_discount_amount, stock_reserved_at, stock_released_at, post_payment_processed_at",
      )
      .eq("merchant_oid", merchantOid)
      .maybeSingle();

    if (orderError) {
      console.error("PayTR order lookup error:", orderError);
      return new NextResponse("PAYTR order lookup failed", { status: 500 });
    }
    if (!order)
      return new NextResponse("PAYTR order not found", { status: 404 });

    const expectedTotal = Number(order.paytr_total_amount);
    if (
      !Number.isSafeInteger(expectedTotal) ||
      expectedTotal !== callbackTotal
    ) {
      console.error("PayTR amount mismatch", {
        merchantOid,
        expectedTotal,
        callbackTotal,
      });
      return new NextResponse("PAYTR notification failed: amount mismatch", {
        status: 400,
      });
    }

    if (status === "failed") {
      if (
        order.payment_status !== "paid" &&
        order.payment_status !== "partially_refunded" &&
        order.payment_status !== "refunded"
      ) {
        const { error: failUpdateError } = await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "failed",
            status: "Ödeme Başarısız",
            failed_reason: failedReasonMsg || "Ödeme başarısız.",
          })
          .eq("id", order.id)
          .neq("payment_status", "paid")
          .neq("payment_status", "partially_refunded")
          .neq("payment_status", "refunded");
        if (failUpdateError)
          throw new Error(
            `Başarısız ödeme kaydedilemedi: ${failUpdateError.message}`,
          );
        await releaseOrderStock(Number(order.id));
      }
      return new NextResponse("OK");
    }

    if (
      order.payment_status === "partially_refunded" ||
      order.payment_status === "refunded"
    ) {
      return new NextResponse("OK");
    }

    if (order.stock_released_at) {
      return new NextResponse("PAYTR order inventory is no longer available", {
        status: 409,
      });
    }

    // Idempotent for pre-reserved orders; also covers pending orders created just before deployment.
    await reserveOrderStock(Number(order.id));

    if (order.payment_status !== "paid") {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "Bekliyor",
          paid_at: new Date().toISOString(),
          failed_reason: null,
          reservation_expires_at: null,
        })
        .eq("id", order.id)
        .neq("payment_status", "paid")
        .neq("payment_status", "partially_refunded")
        .neq("payment_status", "refunded");
      if (updateError)
        throw new Error(`Ödeme durumu kaydedilemedi: ${updateError.message}`);
    }

    const claimed = await claimPostPaymentProcessing(Number(order.id));
    if (!claimed) return new NextResponse("OK");

    try {
      const paidOrder = { ...order, payment_status: "paid" } as Record<
        string,
        unknown
      >;
      await registerCouponUsage(paidOrder);
      const trackingToken = createOrderTrackingToken(merchantOid, merchantKey);
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "https://prestigeso.com.tr";
      const trackingUrl = order.user_id
        ? `${siteUrl}/profile`
        : `${siteUrl}/siparis-takip?oid=${encodeURIComponent(merchantOid)}&token=${encodeURIComponent(trackingToken)}`;
      await sendConfirmationEmail(paidOrder, callbackTotal, trackingUrl);
      await finishPostPaymentProcessing(Number(order.id), true);
    } catch (postPaymentError) {
      await finishPostPaymentProcessing(Number(order.id), false);
      throw postPaymentError;
    }

    return new NextResponse("OK");
  } catch (error) {
    console.error("PayTR callback unexpected error:", error);
    return new NextResponse("PAYTR callback unexpected error", { status: 500 });
  }
}
