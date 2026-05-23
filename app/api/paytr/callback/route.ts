import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase } from "@/lib/supabase";

function safeParseItems(items: any): any[] {
  try {
    if (Array.isArray(items)) return items;
    if (typeof items === "string") return JSON.parse(items || "[]");
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

    const checkHash = crypto
      .createHmac("sha256", merchantKey)
      .update(merchantOid + merchantSalt + status + totalAmount)
      .digest("base64");

    if (hash !== checkHash) {
      return new NextResponse("PAYTR notification failed: bad hash", {
        status: 400,
      });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payment_status, items")
      .eq("merchant_oid", merchantOid)
      .maybeSingle();

    if (orderError || !order) {
      return new NextResponse("OK");
    }

    if (order.payment_status === "paid") {
      return new NextResponse("OK");
    }

    if (status === "success") {
      await supabase
        .from("orders")
        .update({
          payment_status: "paid",
          status: "Bekliyor",
          paid_at: new Date().toISOString(),
        })
        .eq("merchant_oid", merchantOid);

      const items = safeParseItems(order.items);

      for (const item of items) {
        const productId = item.id;
        const quantity = Number(item.quantity || 1);

        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", productId)
          .single();

        if (product) {
          const nextStock = Math.max(Number(product.stock || 0) - quantity, 0);

          await supabase
            .from("products")
            .update({ stock: nextStock })
            .eq("id", productId);
        }
      }

      return new NextResponse("OK");
    }

    await supabase
      .from("orders")
      .update({
        payment_status: "failed",
        status: "Ödeme Başarısız",
        failed_reason: failedReasonMsg || "Ödeme başarısız.",
      })
      .eq("merchant_oid", merchantOid);

    return new NextResponse("OK");
  } catch {
    return new NextResponse("OK");
  }
}