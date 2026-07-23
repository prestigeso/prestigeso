import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { safeParseIds, normalizePhone, isValidTurkishPhone } from "@/lib/utils";
import {
  releaseExpiredReservations,
  releaseOrderStock,
  reserveOrderCoupon,
  reserveOrderStock,
} from "@/lib/orderInventory";
import { consumeOtpProof, verifyOtpProof } from "@/lib/otpProof";
import {
  consumeRateLimit,
  getClientIp as getRateLimitClientIp,
} from "@/lib/rateLimit";
import {
  aggregateCartQuantities,
  aggregateCartLines,
  calculateDiscount,
  calculateShipping,
  roundMoney,
} from "@/lib/commerce/orderRules";
import { getEffectiveUnitPrice } from "@/lib/commerce/pricing";

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

type ProductRow = {
  id: number;
  name: string;
  price: number | string;
  discount_price?: number | string | null;
  stock: number | string | null;
  image?: string | null;
  images?: string[] | null;
};

const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  shipping_fee: 0,
  free_shipping_threshold: 0,
  shipping_enabled: true,
};

function getPaytrClientIp(req: NextRequest) {
  const detected = getRateLimitClientIp(req);
  return detected === "unknown" ? "127.0.0.1" : detected;
}

function makeMerchantOid() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `PRS${year}${month}${day}${random}`;
}

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function normalizeCouponCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 40);
}

function calculateCouponDiscount(coupon: CouponRow, subtotal: number) {
  const safeSubtotal = Number(subtotal || 0);
  if (!Number.isFinite(safeSubtotal) || safeSubtotal <= 0) return 0;

  const minOrderAmount = Number(coupon.min_order_amount || 0);
  if (safeSubtotal < minOrderAmount) return 0;

  return calculateDiscount({
    subtotal: safeSubtotal,
    type: coupon.discount_type,
    value: Number(coupon.discount_value || 0),
    maxDiscount:
      coupon.max_discount_amount == null
        ? null
        : Number(coupon.max_discount_amount),
  });
}

function isCouponInDateRange(coupon: CouponRow) {
  const now = Date.now();
  if (coupon.starts_at && new Date(coupon.starts_at).getTime() > now)
    return false;
  if (coupon.ends_at && new Date(coupon.ends_at).getTime() < now) return false;
  return true;
}

function normalizeShippingSettings(value: unknown): ShippingSettings {
  const source = value && typeof value === "object" ? value : {};
  const settings = source as Record<string, unknown>;
  const shippingFee = Number(settings.shipping_fee || 0);
  const freeShippingThreshold = Number(settings.free_shipping_threshold || 0);

  return {
    shipping_fee:
      Number.isFinite(shippingFee) && shippingFee > 0 ? shippingFee : 0,
    free_shipping_threshold:
      Number.isFinite(freeShippingThreshold) && freeShippingThreshold > 0
        ? freeShippingThreshold
        : 0,
    shipping_enabled: settings.shipping_enabled !== false,
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

function calculateShippingFee(
  settings: ShippingSettings,
  subtotalAfterCoupon: number,
) {
  return calculateShipping({
    enabled: settings.shipping_enabled,
    threshold: Number(settings.free_shipping_threshold || 0),
    fee: Number(settings.shipping_fee || 0),
    subtotal: subtotalAfterCoupon,
  });
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

  if (couponError || !coupon)
    throw new Error("Kupon bulunamadı veya aktif değil.");

  const typedCoupon = coupon as CouponRow;
  if (!typedCoupon.is_active) throw new Error("Bu kupon aktif değil.");
  if (typedCoupon.is_member_only && checkoutMode !== "member")
    throw new Error("Bu kupon sadece üyeler için geçerlidir.");
  if (!isCouponInDateRange(typedCoupon))
    throw new Error("Bu kuponun geçerlilik süresi uygun değil.");

  const minOrderAmount = Number(typedCoupon.min_order_amount || 0);
  if (subtotal < minOrderAmount) {
    throw new Error(
      `Bu kupon için sepet tutarı en az ${minOrderAmount.toLocaleString("tr-TR")} TL olmalıdır.`,
    );
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
    .eq("user_id", userId)
    .is("released_at", null);

  if (usageError) throw new Error("Kupon kullanım geçmişi kontrol edilemedi.");

  const perUserLimit = Number(typedCoupon.usage_limit_per_user || 1);
  if (Number(userUsageCount || 0) >= perUserLimit)
    throw new Error("Bu kuponu daha önce kullandınız.");

  const discountAmount = calculateCouponDiscount(typedCoupon, subtotal);
  if (discountAmount <= 0)
    throw new Error("Bu kupon mevcut sepet için indirim oluşturmuyor.");

  return { coupon: typedCoupon, discountAmount };
}

export async function POST(req: NextRequest) {
  let createdOrderId: number | null = null;

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
        { status: 500 },
      );
    }

    await releaseExpiredReservations();

    const body = await req.json();
    const checkoutMode = body.checkoutMode === "member" ? "member" : "guest";
    let requestedEmail = normalizeEmail(body.userEmail);
    const requestedCouponCode = normalizeCouponCode(body.couponCode);
    const items = Array.isArray(body.items) ? body.items : [];
    const shippingAddress = body.shippingAddress || null;

    // --- userId doğrulaması: client'tan gelen değere güvenmek yerine auth token'dan çözümle ---
    let userId: string | null = null;
    if (checkoutMode === "member") {
      const authHeader = req.headers.get("authorization");
      const accessToken = authHeader?.replace("Bearer ", "");

      if (!accessToken) {
        return NextResponse.json(
          { error: "Üye siparişi için giriş yapmanız gerekiyor." },
          { status: 401 },
        );
      }

      const supabaseAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );

      const {
        data: { user: authUser },
        error: authError,
      } = await supabaseAuth.auth.getUser(accessToken);

      if (authError || !authUser) {
        return NextResponse.json(
          { error: "Oturum doğrulanamadı. Lütfen tekrar giriş yapın." },
          { status: 401 },
        );
      }

      userId = authUser.id;
      requestedEmail = normalizeEmail(authUser.email);
    }

    if (requestedEmail && !isValidEmail(requestedEmail))
      return NextResponse.json(
        { error: "Geçersiz e-posta adresi." },
        { status: 400 },
      );
    if (checkoutMode === "member" && (!userId || !requestedEmail))
      return NextResponse.json(
        { error: "Üye siparişi için giriş yapmanız gerekiyor." },
        { status: 401 },
      );
    if (
      checkoutMode === "guest" &&
      (!requestedEmail ||
        !verifyOtpProof(
          body.otpVerificationToken,
          requestedEmail,
          "guest_checkout",
        ))
    ) {
      return NextResponse.json(
        { error: "Misafir ödemesi için e-posta doğrulaması gerekiyor." },
        { status: 401 },
      );
    }
    const rateLimitIp = getRateLimitClientIp(req);
    const [globalLimit, ipLimit, identityLimit] = await Promise.all([
      consumeRateLimit({
        bucket: "checkout-global",
        identifier: "checkout",
        maxRequests: 300,
        windowSeconds: 300,
      }),
      consumeRateLimit({
        bucket: "checkout-ip",
        identifier: rateLimitIp,
        maxRequests: 12,
        windowSeconds: 600,
      }),
      consumeRateLimit({
        bucket: "checkout-identity",
        identifier: userId || requestedEmail || rateLimitIp,
        maxRequests: 6,
        windowSeconds: 600,
      }),
    ]);
    const blockedLimit = [globalLimit, ipLimit, identityLimit].find(
      (limit) => !limit.allowed,
    );
    if (blockedLimit) {
      return NextResponse.json(
        { error: "Çok fazla ödeme oturumu oluşturuldu. Lütfen daha sonra tekrar deneyin." },
        {
          status: 429,
          headers: { "Retry-After": String(blockedLimit.retryAfterSeconds) },
        },
      );
    }
    if (!shippingAddress)
      return NextResponse.json(
        { error: "Teslimat adresi zorunludur." },
        { status: 400 },
      );

    const userPhone = normalizePhone(shippingAddress.phone);
    if (!isValidTurkishPhone(userPhone))
      return NextResponse.json(
        { error: "Geçerli bir telefon numarası zorunludur." },
        { status: 400 },
      );

    if (
      !shippingAddress.firstName ||
      !shippingAddress.lastName ||
      !shippingAddress.city ||
      !shippingAddress.district ||
      !shippingAddress.neighborhood ||
      !shippingAddress.fullAddress
    ) {
      return NextResponse.json(
        { error: "Teslimat adresi eksik." },
        { status: 400 },
      );
    }

    if (items.length === 0)
      return NextResponse.json({ error: "Sepet boş." }, { status: 400 });

    let quantitiesByProductId: Map<number, number>;
    let cartLines: ReturnType<typeof aggregateCartLines>;
    try {
      cartLines = aggregateCartLines(items);
      quantitiesByProductId = aggregateCartQuantities(items);
    } catch (error) {
      const code = error instanceof Error ? error.message : "INVALID_CART";
      const message =
        code === "MAX_QUANTITY_EXCEEDED"
          ? "Aynı üründen en fazla 99 adet satın alabilirsiniz."
          : "Ürün miktarı 1 ile 99 arasında tam sayı olmalıdır.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const productIds = Array.from(quantitiesByProductId.keys());
    if (productIds.length === 0)
      return NextResponse.json(
        { error: "Sepet ürünleri geçersiz." },
        { status: 400 },
      );

    const { data: products, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, discount_price, stock, image, images")
      .in("id", productIds);

    const variantIds = cartLines.flatMap((line) =>
      line.variantId ? [line.variantId] : [],
    );
    const { data: variants, error: variantError } = variantIds.length
      ? await supabaseAdmin
          .from("product_variants")
          .select("id,product_id,sku,option_values,price,stock,is_active")
          .in("id", variantIds)
      : { data: [], error: null };
    const {
      data: activeProductVariants,
      error: activeProductVariantsError,
    } = await supabaseAdmin
      .from("product_variants")
      .select("id,product_id")
      .in("product_id", productIds)
      .eq("is_active", true);

    if (
      productError ||
      variantError ||
      activeProductVariantsError ||
      !products
    )
      return NextResponse.json(
        { error: "Ürünler kontrol edilemedi." },
        { status: 500 },
      );

    // GÜVENLİK: Tüm fiyat, indirim, kargo ve toplam tutar hesaplamaları sunucu tarafında
    // bağımsız olarak yapılır. Client'tan gelen fiyat bilgilerine asla güvenilmez.
    // Client yalnızca ürün ID, miktar, adres ve kupon kodu gönderir.

    const { data: campaigns } = await supabaseAdmin
      .from("campaigns")
      .select("*");
    const nowIso = new Date().toISOString();

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Sepetteki ürünlerden biri bulunamadı." },
        { status: 400 },
      );
    }

    if ((variants || []).length !== variantIds.length) {
      return NextResponse.json(
        { error: "Sepetteki varyantlardan biri bulunamadı." },
        { status: 400 },
      );
    }

    const checkedItems = cartLines.map((line) => {
      const productId = line.productId;
      const product = (products as ProductRow[]).find(
        (row) => Number(row.id) === productId,
      );
      if (!product) throw new Error("Ürün bulunamadı.");

      const quantity = line.quantity;
      const productRequiresVariant = (activeProductVariants || []).some(
        (row) => Number(row.product_id) === productId,
      );
      if (productRequiresVariant && !line.variantId) {
        throw new Error(`${product.name} için bir ürün seçeneği seçilmelidir.`);
      }
      const variant = line.variantId
        ? (variants || []).find(
            (row) =>
              Number(row.id) === line.variantId &&
              Number(row.product_id) === productId &&
              row.is_active !== false,
          )
        : null;
      if (line.variantId && !variant) throw new Error("Ürün varyantı geçersiz.");
      const availableStock = variant ? Number(variant.stock || 0) : Number(product.stock || 0);
      if (availableStock < quantity) throw new Error(`${product.name} stokta yetersiz.`);

      const activeCampaign = campaigns?.find(
        (campaign: Record<string, unknown>) => {
          const ids = safeParseIds(campaign.product_ids);
          return (
            ids.includes(Number(product.id)) &&
            nowIso >= String(campaign.start_date) &&
            nowIso <= String(campaign.end_date)
          );
        },
      );

      const basePrice = variant?.price == null ? Number(product.price) : Number(variant.price);
      const activePrice = getEffectiveUnitPrice({
        basePrice,
        discountPrice: variant?.price == null ? product.discount_price : undefined,
        campaignPercent: activeCampaign?.discount_percent,
      });

      return {
        id: product.id,
        name: product.name,
        price: roundMoney(activePrice),
        quantity,
        ...(variant
          ? {
              variant_id: Number(variant.id),
              variant_sku: String(variant.sku),
              variant_options: variant.option_values,
            }
          : {}),
        image: product.images?.[0] || product.image || "/logo.jpeg",
        images: product.images || [],
      };
    });

    const subtotalAmount = roundMoney(
      checkedItems.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 1),
        0,
      ),
    );
    if (!Number.isFinite(subtotalAmount) || subtotalAmount <= 0)
      return NextResponse.json(
        { error: "Geçersiz ödeme tutarı." },
        { status: 400 },
      );

    const couponValidation = await validateCouponOnServer({
      couponCode: requestedCouponCode,
      checkoutMode,
      userId,
      subtotal: subtotalAmount,
    });
    const appliedCoupon = couponValidation.coupon;
    const couponDiscountAmount = couponValidation.discountAmount;
    const subtotalAfterCoupon = roundMoney(
      Math.max(0, subtotalAmount - couponDiscountAmount),
    );
    const shippingSettings = await getShippingSettings();
    const shippingFeeAmount = calculateShippingFee(
      shippingSettings,
      subtotalAfterCoupon,
    );
    const totalAmount = roundMoney(subtotalAfterCoupon + shippingFeeAmount);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0)
      return NextResponse.json(
        { error: "Geçersiz ödeme tutarı." },
        { status: 400 },
      );

    const merchantOid = makeMerchantOid();
    const trackingToken = crypto
      .createHmac("sha256", merchantKey)
      .update(`tracking:${merchantOid}`)
      .digest("base64url");
    const trackingTokenHash = crypto
      .createHash("sha256")
      .update(trackingToken)
      .digest("hex");
    const effectiveEmail =
      requestedEmail || `guest-${merchantOid.toLowerCase()}@prestigeso.com.tr`;
    const userIp = getPaytrClientIp(req);
    const userName =
      `${shippingAddress.firstName || ""} ${shippingAddress.lastName || ""}`.trim() ||
      effectiveEmail;
    const userAddress =
      shippingAddress.fullAddress ||
      shippingAddress.full_address ||
      shippingAddress.address ||
      "Adres belirtilmedi";
    const paymentAmount = Math.round(totalAmount * 100);

    const basketItems: Array<[string, string, number]> = checkedItems.map(
      (item) => [
        item.name,
        Number(item.price || 0).toFixed(2),
        Number(item.quantity || 1),
      ],
    );

    if (appliedCoupon && couponDiscountAmount > 0) {
      basketItems.push([
        `Kupon İndirimi (${appliedCoupon.code})`,
        `-${couponDiscountAmount.toFixed(2)}`,
        1,
      ]);
    }

    if (shippingFeeAmount > 0)
      basketItems.push(["Kargo Ücreti", shippingFeeAmount.toFixed(2), 1]);

    const userBasket = Buffer.from(JSON.stringify(basketItems)).toString(
      "base64",
    );

    const noInstallment = "0";
    const maxInstallment = "12";
    const currency = "TL";
    const timeoutLimit = "30";
    const debugOn = "1";
    const merchantOkUrl = `${siteUrl}/odeme/basarili?oid=${encodeURIComponent(merchantOid)}&token=${encodeURIComponent(trackingToken)}`;
    const merchantFailUrl = `${siteUrl}/odeme/basarisiz?oid=${encodeURIComponent(merchantOid)}&token=${encodeURIComponent(trackingToken)}`;

    const hashStr =
      merchantId +
      userIp +
      merchantOid +
      effectiveEmail +
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

    const { data: insertedOrder, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert([
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
          tracking_token_hash: trackingTokenHash,
          // BUG-15: Kupon bilgisini ayrı kolonlarda sakla
          coupon_code: appliedCoupon?.code?.toUpperCase() || null,
          coupon_discount_amount:
            couponDiscountAmount > 0 ? couponDiscountAmount : null,
        },
      ])
      .select("id")
      .single();

    if (orderError || !insertedOrder) {
      return NextResponse.json(
        {
          error:
            "Sipariş oluşturulamadı: " +
            (orderError?.message || "Bilinmeyen hata"),
        },
        { status: 500 },
      );
    }

    createdOrderId = Number(insertedOrder.id);
    if (
      checkoutMode === "guest" &&
      !(await consumeOtpProof(
        body.otpVerificationToken,
        requestedEmail,
        "guest_checkout",
      ))
    ) {
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "failed",
          status: "Ödeme Başlatılamadı",
          failed_reason: "E-posta doğrulaması daha önce kullanılmış veya süresi dolmuş.",
        })
        .eq("id", createdOrderId);
      return NextResponse.json(
        { error: "E-posta doğrulaması daha önce kullanılmış veya süresi dolmuş." },
        { status: 409 },
      );
    }
    if (appliedCoupon && userId && couponDiscountAmount > 0) {
      try {
        await reserveOrderCoupon({
          couponId: String(appliedCoupon.id),
          userId,
          orderId: createdOrderId,
          couponCode: appliedCoupon.code,
          discountAmount: couponDiscountAmount,
        });
      } catch {
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "failed",
            status: "Ödeme Başlatılamadı",
            failed_reason: "Kupon kullanım limiti doldu.",
          })
          .eq("id", createdOrderId);
        return NextResponse.json(
          { error: "Kupon kullanım limiti doldu veya kupon artık geçerli değil." },
          { status: 409 },
        );
      }
    }
    try {
      await reserveOrderStock(createdOrderId);
    } catch (reservationError) {
      const message =
        reservationError instanceof Error
          ? reservationError.message
          : "Stok rezerve edilemedi.";
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status: "failed",
          status: "Stok Yetersiz",
          failed_reason: message,
        })
        .eq("id", createdOrderId);
      return NextResponse.json(
        {
          error:
            "Sepetteki bir veya daha fazla ürün için yeterli stok kalmadı.",
        },
        { status: 409 },
      );
    }

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

    const paytrResponse = await fetch(
      "https://www.paytr.com/odeme/api/get-token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      },
    );

    const paytrResult = await paytrResponse.json();
    if (paytrResult.status !== "success") {
      await releaseOrderStock(createdOrderId);
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
        { status: 400 },
      );
    }

    return NextResponse.json({
      token: paytrResult.token,
      merchant_oid: merchantOid,
      tracking_token: trackingToken,
      iframe_url: `https://www.paytr.com/odeme/guvenli/${paytrResult.token}`,
      coupon: appliedCoupon
        ? { code: appliedCoupon.code, discount_amount: couponDiscountAmount }
        : null,
      subtotal_amount: subtotalAmount,
      total_after_coupon: subtotalAfterCoupon,
      shipping_fee: shippingFeeAmount,
      free_shipping_threshold: shippingSettings.free_shipping_threshold,
      total_amount: totalAmount,
    });
  } catch (err: unknown) {
    if (createdOrderId !== null) {
      try {
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "failed",
            status: "Ödeme Başlatılamadı",
            failed_reason: "Ödeme oturumu oluşturulamadı.",
          })
          .eq("id", createdOrderId)
          .eq("payment_status", "pending");
        await releaseOrderStock(createdOrderId);
      } catch (releaseError) {
        console.error(
          "PayTR token hatası sonrası stok iadesi başarısız:",
          releaseError,
        );
      }
    }
    const message =
      err instanceof Error ? err.message : "PayTR token oluşturulamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
