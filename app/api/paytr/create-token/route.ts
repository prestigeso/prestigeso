import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function safeParseIds(ids: unknown): number[] {
  if (Array.isArray(ids)) {
    return ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  }

  if (typeof ids === "string") {
    try {
      const parsed = JSON.parse(ids);

      if (Array.isArray(parsed)) {
        return parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x));
      }

      return [];
    } catch {
      return [];
    }
  }

  return [];
}

function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");

  if (realIp) {
    return realIp;
  }

  return "127.0.0.1";
}

function makeMerchantOid() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  const random = Math.random().toString(36).slice(2, 10).toUpperCase();

  return `PRS-${year}${month}${day}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const merchantId = process.env.PAYTR_MERCHANT_ID;
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

    const testMode = process.env.PAYTR_TEST_MODE || "1";
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://prestigeso.com.tr";

    if (!merchantId || !merchantKey || !merchantSalt) {
      return NextResponse.json(
        { error: "PayTR API bilgileri eksik." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const userId = body.userId || null;
    const userEmail = String(body.userEmail || "").trim().toLowerCase();
    const items = Array.isArray(body.items) ? body.items : [];
    const shippingAddress = body.shippingAddress || null;

    if (!userEmail) {
      return NextResponse.json(
        { error: "E-posta adresi zorunludur." },
        { status: 400 }
      );
    }

    if (!shippingAddress) {
      return NextResponse.json(
        { error: "Teslimat adresi zorunludur." },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json({ error: "Sepet boş." }, { status: 400 });
    }

    const productIds = items.map((item: any) => Number(item.id));

    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, stock, image, images")
      .in("id", productIds);

    if (productError || !products) {
      return NextResponse.json(
        { error: "Ürünler kontrol edilemedi." },
        { status: 500 }
      );
    }

    const { data: campaigns } = await supabaseAdmin
      .from("campaigns")
      .select("*");

    const nowIso = new Date().toISOString();

    const checkedItems = items.map((cartItem: any) => {
      const product = products.find(
        (p: any) => String(p.id) === String(cartItem.id)
      );

      if (!product) {
        throw new Error(`${cartItem.name || "Ürün"} bulunamadı.`);
      }

      const quantity = Number(cartItem.quantity || 1);

      if (Number(product.stock || 0) < quantity) {
        throw new Error(`${product.name} stokta yetersiz.`);
      }

      const activeCampaign = campaigns?.find((campaign: any) => {
        const ids = safeParseIds(campaign.product_ids);

        return (
          ids.includes(Number(product.id)) &&
          nowIso >= campaign.start_date &&
          nowIso <= campaign.end_date
        );
      });

      const activePrice = activeCampaign
        ? Number(product.price) *
          (1 - Number(activeCampaign.discount_percent) / 100)
        : Number(product.price);

      return {
        id: product.id,
        name: product.name,
        price: activePrice,
        quantity,
        image: product.images?.[0] || product.image || "/logo.jpeg",
        images: product.images || [],
      };
    });

    const totalAmount = checkedItems.reduce((sum: number, item: any) => {
      return sum + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Geçersiz ödeme tutarı." },
        { status: 400 }
      );
    }

    const merchantOid = makeMerchantOid();
    const userIp = getClientIp(req);

    const userName =
      `${shippingAddress.firstName || ""} ${
        shippingAddress.lastName || ""
      }`.trim() || userEmail;

    const userAddress =
      shippingAddress.fullAddress ||
      shippingAddress.full_address ||
      shippingAddress.address ||
      "Adres belirtilmedi";

    const userPhone = shippingAddress.phone || "0000000000";

    const paymentAmount = Math.round(totalAmount * 100);

    const userBasket = Buffer.from(
      JSON.stringify(
        checkedItems.map((item: any) => [
          item.name,
          Number(item.price || 0).toFixed(2),
          Number(item.quantity || 1),
        ])
      )
    ).toString("base64");

    const noInstallment = "0";
    const maxInstallment = "12";
    const currency = "TL";
    const timeoutLimit = "30";
    const debugOn = "1";

    const merchantOkUrl = `${siteUrl}/odeme/basarili?oid=${merchantOid}`;
    const merchantFailUrl = `${siteUrl}/odeme/basarisiz?oid=${merchantOid}`;

    const hashStr =
      merchantId +
      userIp +
      merchantOid +
      userEmail +
      paymentAmount +
      userBasket +
      noInstallment +
      maxInstallment +
      currency +
      testMode;

    const paytrToken = crypto
      .createHmac("sha256", merchantKey)
      .update(hashStr + merchantSalt)
      .digest("base64");

    const { error: orderError } = await supabaseAdmin.from("orders").insert([
      {
        order_no: merchantOid,
        merchant_oid: merchantOid,
        user_id: userId,
        user_email: userEmail,
        items: checkedItems,
        total_amount: totalAmount,
        shipping_address: JSON.stringify(shippingAddress),
        status: "Ödeme Bekleniyor",
        payment_provider: "paytr",
        payment_status: "pending",
        paytr_total_amount: paymentAmount,
      },
    ]);

    if (orderError) {
      return NextResponse.json(
        { error: "Sipariş oluşturulamadı: " + orderError.message },
        { status: 500 }
      );
    }

    const params = new URLSearchParams();

    params.append("merchant_id", merchantId);
    params.append("user_ip", userIp);
    params.append("merchant_oid", merchantOid);
    params.append("email", userEmail);
    params.append("payment_amount", String(paymentAmount));
    params.append("paytr_token", paytrToken);
    params.append("user_basket", userBasket);
    params.append("debug_on", debugOn);
    params.append("no_installment", noInstallment);
    params.append("max_installment", maxInstallment);
    params.append("user_name", userName);
    params.append("user_address", userAddress);
    params.append("user_phone", userPhone);
    params.append("merchant_ok_url", merchantOkUrl);
    params.append("merchant_fail_url", merchantFailUrl);
    params.append("timeout_limit", timeoutLimit);
    params.append("currency", currency);
    params.append("test_mode", testMode);

    const paytrResponse = await fetch(
      "https://www.paytr.com/odeme/api/get-token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const paytrResult = await paytrResponse.json();

    if (paytrResult.status !== "success") {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "failed",
          status: "Ödeme Başlatılamadı",
          failed_reason: paytrResult.reason || "PayTR token alınamadı.",
        })
        .eq("merchant_oid", merchantOid);

      return NextResponse.json(
        { error: paytrResult.reason || "PayTR token alınamadı." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      token: paytrResult.token,
      merchant_oid: merchantOid,
      iframe_url: `https://www.paytr.com/odeme/guvenli/${paytrResult.token}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "PayTR token oluşturulamadı." },
      { status: 500 }
    );
  }
}
