import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function safeParseItems(items: any): any[] {
  try {
    if (Array.isArray(items)) return items;
    if (typeof items === "string") return JSON.parse(items || "[]");
    return [];
  } catch {
    return [];
  }
}

function safeParseObject(value: any): any {
  try {
    if (!value) return null;
    if (typeof value === "object") return value;
    if (typeof value === "string") return JSON.parse(value || "null");
    return null;
  } catch {
    return null;
  }
}

async function registerCouponUsage(order: any) {
  const shippingAddress = safeParseObject(order?.shipping_address);
  const coupon = shippingAddress?.coupon;

  if (!coupon?.id || !coupon?.code || !order?.user_id) {
    return;
  }

  const discountAmount = Number(coupon.discount_amount || 0);

  if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
    return;
  }

  const { data: existingUsage, error: existingUsageError } = await supabaseAdmin
    .from("coupon_usages")
    .select("id")
    .eq("order_id", order.id)
    .eq("coupon_id", coupon.id)
    .maybeSingle();

  if (existingUsageError) {
    console.error("Coupon usage lookup error:", existingUsageError);
    return;
  }

  if (existingUsage) {
    return;
  }

  const { error: usageInsertError } = await supabaseAdmin.from("coupon_usages").insert([
    {
      coupon_id: coupon.id,
      user_id: order.user_id,
      order_id: order.id,
      coupon_code: String(coupon.code).toUpperCase(),
      discount_amount: discountAmount,
    },
  ]);

  if (usageInsertError) {
    console.error("Coupon usage insert error:", usageInsertError);
    return;
  }

  const { data: couponRow, error: couponLookupError } = await supabaseAdmin
    .from("coupons")
    .select("used_count")
    .eq("id", coupon.id)
    .maybeSingle();

  if (couponLookupError || !couponRow) {
    console.error("Coupon used_count lookup error:", couponLookupError);
    return;
  }

  const nextUsedCount = Number(couponRow.used_count || 0) + 1;

  const { error: couponUpdateError } = await supabaseAdmin
    .from("coupons")
    .update({ used_count: nextUsedCount })
    .eq("id", coupon.id);

  if (couponUpdateError) {
    console.error("Coupon used_count update error:", couponUpdateError);
  }
}

export async function POST(req: NextRequest) {
  try {
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

    if (!merchantKey || !merchantSalt) {
      return new NextResponse("PAYTR ENV ERROR", { status: 500 });
    }

    const formData = await req.formData();

    const merchantOid = String(formData.get("merchant_oid") || "");
    const status = String(formData.get("status") || "");
    const totalAmount = String(formData.get("total_amount") || "");
    const hash = String(formData.get("hash") || "");
    const failedReasonMsg = String(formData.get("failed_reason_msg") || "");

    const checkHash = crypto
      .createHmac("sha256", merchantKey)
      .update(merchantOid + merchantSalt + status + totalAmount)
      .digest("base64");

    if (hash !== checkHash) {
      return new NextResponse("PAYTR notification failed: bad hash", {
        status: 400,
      });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, payment_status, items, shipping_address")
      .eq("merchant_oid", merchantOid)
      .maybeSingle();

    if (orderError) {
      console.error("PayTR order lookup error:", orderError);
      return new NextResponse("PAYTR order lookup failed", { status: 500 });
    }

    if (!order) {
      return new NextResponse("OK");
    }

    if (order.payment_status === "paid") {
      return new NextResponse("OK");
    }

    if (status === "success") {
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "Bekliyor",
          paid_at: new Date().toISOString(),
          failed_reason: null,
        })
        .eq("merchant_oid", merchantOid)
        .neq("payment_status", "paid")
        .select("id, user_id, items, shipping_address")
        .maybeSingle();

      if (updateError) {
        console.error("PayTR order update error:", updateError);
        return new NextResponse("PAYTR order update failed", { status: 500 });
      }

      if (!updatedOrder) {
        return new NextResponse("OK");
      }

      const items = safeParseItems(updatedOrder.items || order.items);

      for (const item of items) {
        const productId = item.id;
        const quantity = Number(item.quantity || 1);

        if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
          continue;
        }

        const { data: product, error: productError } = await supabaseAdmin
          .from("products")
          .select("stock")
          .eq("id", productId)
          .single();

        if (productError || !product) {
          console.error("PayTR stock lookup error:", productError);
          continue;
        }

        const nextStock = Math.max(Number(product.stock || 0) - quantity, 0);

        const { error: stockUpdateError } = await supabaseAdmin
          .from("products")
          .update({ stock: nextStock })
          .eq("id", productId);

        if (stockUpdateError) {
          console.error("PayTR stock update error:", stockUpdateError);
        }
      }

      await registerCouponUsage(updatedOrder);

      return new NextResponse("OK");
    }

    const { error: failUpdateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "failed",
        status: "Ödeme Başarısız",
        failed_reason: failedReasonMsg || "Ödeme başarısız.",
      })
      .eq("merchant_oid", merchantOid)
      .neq("payment_status", "paid");

    if (failUpdateError) {
      console.error("PayTR failed order update error:", failUpdateError);
      return new NextResponse("PAYTR failed order update failed", {
        status: 500,
      });
    }

    return new NextResponse("OK");
  } catch (error) {
    console.error("PayTR callback unexpected error:", error);
    return new NextResponse("PAYTR callback unexpected error", { status: 500 });
  }
}
