import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // 1) Yetki kontrolü
    const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();
    const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
    const adminSession = await verifyAdminSessionCookie(adminSecret, cookieValue);

    if (!adminSession) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // 2) Body parsing
    const body = await req.json();
    const { orderId, newStatus } = body;

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "orderId ve newStatus gereklidir" }, { status: 400 });
    }

    if (!["İptal Edildi", "İade Edildi"].includes(newStatus)) {
      return NextResponse.json({ error: "Geçersiz iade durumu" }, { status: 400 });
    }

    // 3) Siparişi bul
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, merchant_oid, total_amount, payment_status, status, items")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
    }

    if (order.status === "İptal Edildi" || order.status === "İade Edildi") {
      return NextResponse.json({ error: "Sipariş zaten iptal veya iade edilmiş." }, { status: 400 });
    }

    if (order.payment_status !== "paid") {
      return NextResponse.json({ error: "Ödenmemiş sipariş için iade yapılamaz." }, { status: 400 });
    }

    // 4) PayTR İade (Refund) API Çağrısı
    const merchant_id = process.env.PAYTR_MERCHANT_ID;
    const merchant_key = process.env.PAYTR_MERCHANT_KEY;
    const merchant_salt = process.env.PAYTR_MERCHANT_SALT;

    if (!merchant_id || !merchant_key || !merchant_salt) {
      return NextResponse.json({ error: "PayTR ayarları eksik." }, { status: 500 });
    }

    const merchant_oid = order.merchant_oid;
    // İade tutarı (TL). Kuruş formatında değil. Format: "150" veya "150.50"
    const return_amount = Number(order.total_amount).toFixed(2); 

    // PayTR İade Hash (merchant_id + merchant_oid + return_amount + merchant_salt)
    const hash_str = merchant_id + merchant_oid + return_amount + merchant_salt;
    const paytr_token = crypto.createHmac("sha256", merchant_key).update(hash_str).digest("base64");

    const params = new URLSearchParams();
    params.append("merchant_id", merchant_id);
    params.append("merchant_oid", merchant_oid);
    params.append("return_amount", return_amount);
    params.append("paytr_token", paytr_token);

    const paytrRes = await fetch("https://www.paytr.com/odeme/iade", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const resultStr = await paytrRes.text();
    let paytrResult;
    try {
      paytrResult = JSON.parse(resultStr);
    } catch(e) {
      return NextResponse.json({ error: "PayTR dönüşü JSON formatında değil.", details: resultStr }, { status: 500 });
    }

    if (paytrResult.status !== "success") {
      return NextResponse.json({ error: "PayTR iade işlemi başarısız: " + (paytrResult.err_msg || JSON.stringify(paytrResult)) }, { status: 400 });
    }

    // 5) Veritabanında güncelle
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: newStatus, payment_status: "refunded" })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: "PayTR iadesi başarılı ancak sipariş durumu güncellenemedi." }, { status: 500 });
    }

    // 6) Stokları İade Et
    let itemsArr: any[] = [];
    try {
      if (typeof order.items === "string") itemsArr = JSON.parse(order.items);
      else if (Array.isArray(order.items)) itemsArr = order.items;
    } catch(e) {}
    
    if (itemsArr.length > 0) {
      for (const item of itemsArr) {
        if (item.id && Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0) {
          const { data: prod } = await supabaseAdmin.from("products").select("stock").eq("id", item.id).maybeSingle();
          if (prod) {
            await supabaseAdmin.from("products").update({ stock: Number(prod.stock || 0) + Number(item.quantity) }).eq("id", item.id);
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: `PayTR iadesi yapıldı ve durum ${newStatus} olarak güncellendi. Stoklar iade edildi.` });
  } catch (error: any) {
    console.error("Refund error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
