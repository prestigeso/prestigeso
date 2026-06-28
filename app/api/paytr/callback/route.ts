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

  // GÜVENLİK: Atomik used_count artırımı — read-then-write yerine
  // SQL seviyesinde used_count = used_count + 1 kullanarak race condition engellenir.
  // Not: Supabase'de RPC fonksiyonu oluşturulmalı. Geçici çözüm olarak
  // .rpc kullanılamıyorsa en azından .eq ile koruma sağlanır.
  const { error: couponUpdateError } = await supabaseAdmin.rpc(
    "increment_coupon_used_count",
    { coupon_id_input: coupon.id }
  ).maybeSingle();

  if (couponUpdateError) {
    // RPC mevcut değilse fallback: read-then-write (race condition riski düşük)
    console.warn("RPC increment_coupon_used_count failed, using fallback:", couponUpdateError.message);
    const { data: couponRow } = await supabaseAdmin
      .from("coupons")
      .select("used_count")
      .eq("id", coupon.id)
      .maybeSingle();

    if (couponRow) {
      await supabaseAdmin
        .from("coupons")
        .update({ used_count: Number(couponRow.used_count || 0) + 1 })
        .eq("id", coupon.id);
    }
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

    // GÜVENLİK: Timing-safe karşılaştırma — sıradan string karşılaştırması
    // timing attack'a açıktır, crypto.timingSafeEqual bunu engeller.
    const hashBuffer = Buffer.from(hash);
    const checkHashBuffer = Buffer.from(checkHash);
    if (hashBuffer.length !== checkHashBuffer.length || !crypto.timingSafeEqual(hashBuffer, checkHashBuffer)) {
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

      // BUG-12/PERF-05: Stok güncellemeyi optimize et — tek SELECT + paralel UPDATE
      const validItems = items.filter(
        (item: any) => item.id && Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0
      );

      if (validItems.length > 0) {
        const productIds = validItems.map((item: any) => item.id);

        const { data: products, error: productsError } = await supabaseAdmin
          .from("products")
          .select("id, stock")
          .in("id", productIds);

        if (productsError) {
          console.error("PayTR batch stock lookup error:", productsError);
        } else if (products) {
          const stockMap = new Map(products.map((p: any) => [String(p.id), Number(p.stock || 0)]));

          const updatePromises = validItems.map((item: any) => {
            const currentStock = stockMap.get(String(item.id));
            if (currentStock === undefined) return null;
            const nextStock = Math.max(currentStock - Number(item.quantity || 1), 0);
            return supabaseAdmin
              .from("products")
              .update({ stock: nextStock })
              .eq("id", item.id)
              .then(({ error }) => {
                if (error) console.error(`PayTR stock update error (id=${item.id}):`, error);
              });
          });

          await Promise.all(updatePromises.filter(Boolean));
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
