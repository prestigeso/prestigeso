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
      .select("id, payment_status, items")
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
        .select("id, items")
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
