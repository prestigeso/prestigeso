import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type CouponRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number | string;
  min_order_amount: number | string;
  max_discount_amount?: number | string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number | null;
  used_count?: number | null;
  is_active: boolean;
  is_member_only: boolean;
};

type ShippingSettings = {
  shipping_fee: number;
  free_shipping_threshold: number;
  shipping_enabled: boolean;
};

const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  shipping_fee: 0,
  free_shipping_threshold: 0,
  shipping_enabled: true,
};

function safeParseIds(ids: unknown): number[] {
  if (Array.isArray(ids)) return ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  if (typeof ids === "string") {
    try {
      const parsed = JSON.parse(ids);
      if (Array.isArray(parsed)) return parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    } catch {
      return [];
    }
  }
  return [];
}

function getClientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

function makeMerchantOid() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `PRS${year}${month}${day}${random}`;
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function normalizePhone(value: unknown) {
  return String(value || "").replace(/[^0-9+]/g, "");
}

function isValidTurkishPhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(05\d{9}|5\d{9}|90\d{10})$/.test(digits);
}

function normalizeCouponCode(value: unknown) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function calculateCouponDiscount(coupon: CouponRow, subtotal: number) {
  const safeSubtotal = Number(subtotal || 0);
  if (!Number.isFinite(safeSubtotal) || safeSubtotal <= 0) return 0;

  const minOrderAmount = Number(coupon.min_order_amount || 0);
  if (safeSubtotal < minOrderAmount) return 0;

  let discount = 0;
  if (coupon.discount_type === "fixed") {
    discount = Number(coupon.discount_value || 0);
  } else {
    discount = safeSubtotal * (Number(coupon.discount_value || 0) / 100);
  }

  const maxDiscount = coupon.max_discount_amount;
  if (maxDiscount !== null && maxDiscount !== undefined && Number(maxDiscount) > 0) {
    discount = Math.min(discount, Number(maxDiscount));
  }

  discount = Math.min(discount, safeSubtotal);
  return roundMoney(Math.max(0, discount));
}

function isCouponInDateRange(coupon: CouponRow) {
  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now) return false;
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) return false;
  return true;
}

function normalizeShippingSettings(value: any): ShippingSettings {
  const source = value && typeof value === "object" ? value : {};
  const shippingFee = Number(source.shipping_fee || 0);
  const freeShippingThreshold = Number(source.free_shipping_threshold || 0);

  return {
    shipping_fee: Number.isFinite(shippingFee) && shippingFee > 0 ? shippingFee : 0,
    free_shipping_threshold:
      Number.isFinite(freeShippingThreshold) && freeShippingThreshold > 0
        ? freeShippingThreshold
        : 0,
    shipping_enabled: source.shipping_enabled !== false,
  };
}

async function getShippingSettings(): Promise<ShippingSettings> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "shipping")
    .maybeSingle();

  if (error || !data) return DEFAULT_SHIPPING_SETTINGS;
  return normalizeShippingSettings(data.value);
}

function calculateShippingFee(settings: ShippingSettings, subtotalAfterCoupon: number) {
  if (!settings.shipping_enabled) return 0;
  const threshold = Number(settings.free_shipping_threshold || 0);
  const fee = Number(settings.shipping_fee || 0);
  if (threshold > 0 && subtotalAfterCoupon >= threshold) return 0;
  return fee > 0 ? roundMoney(fee) : 0;
}

async function validateCouponOnServer({
  couponCode,
  checkoutMode,
  userId,
  subtotal,
}: {
  couponCode: string;
  checkoutMode: "member" | "guest";
  userId: string | null;
  subtotal: number;
}) {
  const code = normalizeCouponCode(couponCode);
  if (!code) return { coupon: null as CouponRow | null, discountAmount: 0 };

  if (checkoutMode !== "member" || !userId) {
    throw new Error("Kupon kullanmak için üye girişi yapmalısınız.");
  }

  const { data: coupon, error: couponError } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", code)
    .single();

  if (couponError || !coupon) throw new Error("Kupon bulunamadı veya aktif değil.");

  const typedCoupon = coupon as CouponRow;
  if (!typedCoupon.is_active) throw new Error("Bu kupon aktif değil.");
  if (typedCoupon.is_member_only && checkoutMode !== "member") throw new Error("Bu kupon sadece üyeler için geçerlidir.");
  if (!isCouponInDateRange(typedCoupon)) throw new Error("Bu kuponun geçerlilik süresi uygun değil.");

  const minOrderAmount = Number(typedCoupon.min_order_amount || 0);
  if (subtotal < minOrderAmount) {
    throw new Error(`Bu kupon için sepet tutarı en az ${minOrderAmount.toLocaleString("tr-TR")} TL olmalıdır.`);
  }

  if (
    typedCoupon.usage_limit_total !== null &&
    typedCoupon.usage_limit_total !== undefined &&
    Number(typedCoupon.used_count || 0) >= Number(typedCoupon.usage_limit_total)
  ) {
    throw new Error("Bu kuponun toplam kullanım hakkı dolmuştur.");
  }

  const { count: userUsageCount, error: usageError } = await supabaseAdmin
    .from("coupon_usages")
    .select("id", { count: "exact", head: true })
    .eq("coupon_id", typedCoupon.id)
    .eq("user_id", userId);

  if (usageError) throw new Error("Kupon kullanım geçmişi kontrol edilemedi.");

  const perUserLimit = Number(typedCoupon.usage_limit_per_user || 1);
  if (Number(userUsageCount || 0) >= perUserLimit) throw new Error("Bu kuponu daha önce kullandınız.");

  const discountAmount = calculateCouponDiscount(typedCoupon, subtotal);
  if (discountAmount <= 0) throw new Error("Bu kupon mevcut sepet için indirim oluşturmuyor.");

  return { coupon: typedCoupon, discountAmount };
}

export async function POST(req: NextRequest) {
  try {
    const merchantId = process.env.PAYTR_MERCHANT_ID;
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
    const testMode = process.env.PAYTR_TEST_MODE || "1";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://prestigeso.com.tr";

    if (!merchantId || !merchantKey || !merchantSalt) {
      return NextResponse.json({ error: "PayTR API bilgileri eksik." }, { status: 500 });
    }

    const body = await req.json();
    const userId = body.userId || null;
    const checkoutMode = body.checkoutMode === "member" ? "member" : "guest";
    const requestedEmail = normalizeEmail(body.userEmail);
    const requestedCouponCode = normalizeCouponCode(body.couponCode);
    const items = Array.isArray(body.items) ? body.items : [];
    const shippingAddress = body.shippingAddress || null;

    if (requestedEmail && !isValidEmail(requestedEmail)) return NextResponse.json({ error: "Geçersiz e-posta adresi." }, { status: 400 });
    if (checkoutMode === "member" && (!userId || !requestedEmail)) return NextResponse.json({ error: "Üye siparişi için giriş yapmanız gerekiyor." }, { status: 401 });
    if (!shippingAddress) return NextResponse.json({ error: "Teslimat adresi zorunludur." }, { status: 400 });

    const userPhone = normalizePhone(shippingAddress.phone);
    if (!isValidTurkishPhone(userPhone)) return NextResponse.json({ error: "Geçerli bir telefon numarası zorunludur." }, { status: 400 });

    if (!shippingAddress.firstName || !shippingAddress.lastName || !shippingAddress.city || !shippingAddress.district || !shippingAddress.neighborhood || !shippingAddress.fullAddress) {
      return NextResponse.json({ error: "Teslimat adresi eksik." }, { status: 400 });
    }

    if (items.length === 0) return NextResponse.json({ error: "Sepet boş." }, { status: 400 });

    const productIds = items.map((item: any) => Number(item.id)).filter((id: number) => Number.isFinite(id));
    if (productIds.length === 0) return NextResponse.json({ error: "Sepet ürünleri geçersiz." }, { status: 400 });

    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, stock, image, images")
      .in("id", productIds);

    if (productError || !products) return NextResponse.json({ error: "Ürünler kontrol edilemedi." }, { status: 500 });

    const { data: campaigns } = await supabaseAdmin.from("campaigns").select("*");
    const nowIso = new Date().toISOString();

    const checkedItems = items.map((cartItem: any) => {
      const product = products.find((p: any) => String(p.id) === String(cartItem.id));
      if (!product) throw new Error(`${cartItem.name || "Ürün"} bulunamadı.`);

      const quantity = Number(cartItem.quantity || 1);
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`${product.name} miktarı geçersiz.`);
      if (Number(product.stock || 0) < quantity) throw new Error(`${product.name} stokta yetersiz.`);

      const activeCampaign = campaigns?.find((campaign: any) => {
        const ids = safeParseIds(campaign.product_ids);
        return ids.includes(Number(product.id)) && nowIso >= campaign.start_date && nowIso <= campaign.end_date;
      });

      const activePrice = activeCampaign ? Number(product.price) * (1 - Number(activeCampaign.discount_percent) / 100) : Number(product.price);

      return {
        id: product.id,
        name: product.name,
        price: roundMoney(activePrice),
        quantity,
        image: product.images?.[0] || product.image || "/logo.jpeg",
        images: product.images || [],
      };
    });

    const subtotalAmount = roundMoney(checkedItems.reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0));
    if (!Number.isFinite(subtotalAmount) || subtotalAmount <= 0) return NextResponse.json({ error: "Geçersiz ödeme tutarı." }, { status: 400 });

    const couponValidation = await validateCouponOnServer({ couponCode: requestedCouponCode, checkoutMode, userId, subtotal: subtotalAmount });
    const appliedCoupon = couponValidation.coupon;
    const couponDiscountAmount = couponValidation.discountAmount;
    const subtotalAfterCoupon = roundMoney(Math.max(0, subtotalAmount - couponDiscountAmount));
    const shippingSettings = await getShippingSettings();
    const shippingFeeAmount = calculateShippingFee(shippingSettings, subtotalAfterCoupon);
    const totalAmount = roundMoney(subtotalAfterCoupon + shippingFeeAmount);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return NextResponse.json({ error: "Geçersiz ödeme tutarı." }, { status: 400 });

    const merchantOid = makeMerchantOid();
    const effectiveEmail = requestedEmail || `guest-${merchantOid.toLowerCase()}@prestigeso.com.tr`;
    const userIp = getClientIp(req);
    const userName = `${shippingAddress.firstName || ""} ${shippingAddress.lastName || ""}`.trim() || effectiveEmail;
    const userAddress = shippingAddress.fullAddress || shippingAddress.full_address || shippingAddress.address || "Adres belirtilmedi";
    const paymentAmount = Math.round(totalAmount * 100);

    const basketItems = checkedItems.map((item: any) => [item.name, Number(item.price || 0).toFixed(2), Number(item.quantity || 1)]);

    if (appliedCoupon && couponDiscountAmount > 0) {
      basketItems.push([`Kupon İndirimi (${appliedCoupon.code})`, `-${couponDiscountAmount.toFixed(2)}`, 1]);
    }

    if (shippingFeeAmount > 0) basketItems.push(["Kargo Ücreti", shippingFeeAmount.toFixed(2), 1]);

    const userBasket = Buffer.from(JSON.stringify(basketItems)).toString("base64");

    const noInstallment = "0";
    const maxInstallment = "12";
    const currency = "TL";
    const timeoutLimit = "30";
    const debugOn = "1";
    const merchantOkUrl = `${siteUrl}/odeme/basarili?oid=${merchantOid}`;
    const merchantFailUrl = `${siteUrl}/odeme/basarisiz?oid=${merchantOid}`;

    const hashStr = merchantId + userIp + merchantOid + effectiveEmail + paymentAmount + userBasket + noInstallment + maxInstallment + currency + testMode;
    const paytrToken = crypto.createHmac("sha256", merchantKey).update(hashStr + merchantSalt).digest("base64");

    const shippingAddressForOrder = {
      ...shippingAddress,
      email: requestedEmail || "",
      coupon: appliedCoupon
        ? {
            id: appliedCoupon.id,
            code: appliedCoupon.code,
            discount_type: appliedCoupon.discount_type,
            discount_value: Number(appliedCoupon.discount_value || 0),
            discount_amount: couponDiscountAmount,
            subtotal_amount: subtotalAmount,
            total_after_discount: subtotalAfterCoupon,
          }
        : null,
      shipping: {
        shipping_fee: shippingFeeAmount,
        free_shipping_threshold: shippingSettings.free_shipping_threshold,
        shipping_enabled: shippingSettings.shipping_enabled,
        is_free_shipping: shippingFeeAmount <= 0,
        subtotal_after_coupon: subtotalAfterCoupon,
        final_total: totalAmount,
      },
    };

    const { error: orderError } = await supabaseAdmin.from("orders").insert([
      {
        order_no: merchantOid,
        merchant_oid: merchantOid,
        user_id: checkoutMode === "member" ? userId : null,
        user_email: effectiveEmail,
        items: checkedItems,
        total_amount: totalAmount,
        shipping_address: JSON.stringify(shippingAddressForOrder),
        status: "Ödeme Bekleniyor",
        payment_provider: "paytr",
        payment_status: "pending",
        paytr_total_amount: paymentAmount,
      },
    ]);

    if (orderError) return NextResponse.json({ error: "Sipariş oluşturulamadı: " + orderError.message }, { status: 500 });

    const params = new URLSearchParams();
    params.append("merchant_id", merchantId);
    params.append("user_ip", userIp);
    params.append("merchant_oid", merchantOid);
    params.append("email", effectiveEmail);
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

    const paytrResponse = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const paytrResult = await paytrResponse.json();
    if (paytrResult.status !== "success") {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "failed", status: "Ödeme Başlatılamadı", failed_reason: paytrResult.reason || "PayTR token alınamadı." })
        .eq("merchant_oid", merchantOid);

      return NextResponse.json({ error: paytrResult.reason || "PayTR token alınamadı." }, { status: 400 });
    }

    return NextResponse.json({
      token: paytrResult.token,
      merchant_oid: merchantOid,
      iframe_url: `https://www.paytr.com/odeme/guvenli/${paytrResult.token}`,
      coupon: appliedCoupon ? { code: appliedCoupon.code, discount_amount: couponDiscountAmount } : null,
      subtotal_amount: subtotalAmount,
      total_after_coupon: subtotalAfterCoupon,
      shipping_fee: shippingFeeAmount,
      free_shipping_threshold: shippingSettings.free_shipping_threshold,
      total_amount: totalAmount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "PayTR token oluşturulamadı." }, { status: 500 });
  }
}
