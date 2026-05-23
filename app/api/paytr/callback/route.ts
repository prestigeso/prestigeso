import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// JSON formatında veya Dizi olarak gelen ürünleri güvenli bir şekilde ayrıştırır
function safeParseItems(items: any): any[] {
  try {
    if (Array.isArray(items)) {
      return items;
    }
    if (typeof items === "string") {
      return JSON.parse(items || "[]");
    }
    return [];
  } catch {
    return [];
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

    // 1. PayTR Hash Kontrolü (Güvenlik)
    const checkHash = crypto
      .createHmac("sha256", merchantKey)
      .update(merchantOid + merchantSalt + status + totalAmount)
      .digest("base64");

    if (hash !== checkHash) {
      return new NextResponse("PAYTR notification failed: bad hash", {
        status: 400,
      });
    }

    // 2. Siparişi Veritabanından Çekme
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, payment_status, items")
      .eq("merchant_oid", merchantOid)
      .maybeSingle();

    // Sipariş yoksa PayTR'a OK dönerek bildirimi durdur
    if (orderError || !order) {
      return new NextResponse("OK");
    }

    // Sipariş zaten ödenmişse işlemi tekrar etme
    if (order.payment_status === "paid") {
      return new NextResponse("OK");
    }

    // 3. Başarılı Ödeme Senaryosu
    if (status === "success") {
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "paid",
          status: "Bekliyor",
          paid_at: new Date().toISOString(),
          failed_reason: null,
        })
        .eq("merchant_oid", merchantOid);

      if (updateError) {
        return new NextResponse("OK");
      }

      // 4. Stok Düşme İşlemi
      const items = safeParseItems(order.items);

      for (const item of items) {
        const productId = item.id;
        const quantity = Number(item.quantity || 1);

        if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
          continue;
        }

        const { data: product } = await supabaseAdmin
          .from("products")
          .select("stock")
          .eq("id", productId)
          .single();

        if (!product) {
          continue;
        }

        const nextStock = Math.max(Number(product.stock || 0) - quantity, 0);

        await supabaseAdmin
          .from("products")
          .update({ stock: nextStock })
          .eq("id", productId);
      }

      return new NextResponse("OK");
    }

    // 5. Başarısız Ödeme Senaryosu
    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "failed",
        status: "Ödeme Başarısız",
        failed_reason: failedReasonMsg || "Ödeme başarısız.",
      })
      .eq("merchant_oid", merchantOid);

    return new NextResponse("OK");
  } catch (error) {
    console.error("PayTR Webhook Hatası:", error);
    // Hata olsa bile PayTR'a OK dönüyoruz ki sistemi sürekli bildirim atıp yormasın
    return new NextResponse("OK");
  }
}