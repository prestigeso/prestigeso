import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createClient } from "@supabase/supabase-js";
import { safeParseIds, normalizePhone, isValidTurkishPhone } from "@/lib/utils";
import { releaseExpiredReservations } from "@/lib/orderInventory";
import { verifyOtpProof } from "@/lib/otpProof";
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
import { DISTANCE_SALES_VERSION } from "@/lib/legal/consent";

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

type CheckoutIdempotencyContext = {
  identityHash: string;
  keyHash: string;
  attemptHash: string;
  requestFingerprint: string;
};

type CheckoutIdempotencyClaim = {
  action?:
    | "acquired"
    | "completed"
    | "conflict"
    | "expired"
    | "in_progress"
    | "terminal";
  merchant_oid?: string;
  retry_after?: number;
  status?: number;
  response?: unknown;
};

type OtpConsumption = {
  tokenHash: string;
  expiresAt: string;
};

type CheckoutShippingAddress = {
  address?: string;
  addressTitle?: string;
  city?: string;
  district?: string;
  firstName?: string;
  fullAddress?: string;
  full_address?: string;
  lastName?: string;
  neighborhood?: string;
  phone?: string;
  [key: string]: unknown;
};

type CheckoutRequestBody = {
  checkoutMode?: unknown;
  contractAccepted?: unknown;
  contractVersion?: unknown;
  couponCode?: unknown;
  expectedTotalAmount?: unknown;
  items?: unknown;
  otpVerificationToken?: unknown;
  shippingAddress?: CheckoutShippingAddress | null;
  userEmail?: unknown;
};

type CheckoutBodyResult =
  | { ok: true; body: CheckoutRequestBody }
  | { ok: false; tooLarge: boolean };

const MAX_CHECKOUT_BODY_BYTES = 64 * 1024;

const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  shipping_fee: 0,
  free_shipping_threshold: 0,
  shipping_enabled: true,
};

async function readCheckoutJsonBody(
  req: NextRequest,
): Promise<CheckoutBodyResult> {
  const contentLength = req.headers.get("content-length");
  if (contentLength) {
    const declaredBytes = Number(contentLength);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0)
      return { ok: false, tooLarge: false };
    if (declaredBytes > MAX_CHECKOUT_BODY_BYTES)
      return { ok: false, tooLarge: true };
  }

  if (!req.body) return { ok: false, tooLarge: false };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_CHECKOUT_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, tooLarge: true };
    }
    chunks.push(value);
  }

  const payload = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const body = JSON.parse(new TextDecoder().decode(payload)) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body))
      return { ok: false, tooLarge: false };
    return { ok: true, body: body as CheckoutRequestBody };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

function getPaytrClientIp(req: NextRequest) {
  const detected = getRateLimitClientIp(req);
  return detected === "unknown" ? "127.0.0.1" : detected;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object")
    return JSON.stringify(value ?? null);
  if (Array.isArray(value))
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
    .join(",")}}`;
}

function makeMerchantOid(identityHash: string, keyHash: string) {
  const digest = sha256(`checkout:${identityHash}:${keyHash}`)
    .slice(0, 20)
    .toUpperCase();
  return `PRS${digest}`;
}

function getOtpConsumption(token: unknown): OtpConsumption | null {
  try {
    const [payload] = String(token || "").split(".");
    if (!payload) return null;
    const value = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { exp?: unknown; jti?: unknown };
    const expiresAtMs = Number(value.exp) * 1000;
    if (
      typeof value.jti !== "string" ||
      value.jti.length < 16 ||
      !Number.isFinite(expiresAtMs) ||
      expiresAtMs <= Date.now()
    )
      return null;
    return {
      tokenHash: sha256(value.jti),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  } catch {
    return null;
  }
}

async function failCheckoutIdempotency(
  context: CheckoutIdempotencyContext | null,
) {
  if (!context) return;
  const { error } = await supabaseAdmin.rpc("fail_checkout_idempotency", {
    p_identity_hash: context.identityHash,
    p_key_hash: context.keyHash,
    p_attempt_hash: context.attemptHash,
    p_request_fingerprint: context.requestFingerprint,
  });
  if (error)
    console.error("Checkout idempotency kilidi bırakılamadı:", error.message);
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

  if (error) throw new Error("Kargo ayarları doğrulanamadı.");
  if (!data) return DEFAULT_SHIPPING_SETTINGS;
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
  let idempotencyContext: CheckoutIdempotencyContext | null = null;
  let finalizationStarted = false;

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

    const rateLimitIp = getRateLimitClientIp(req);
    const ipLimit = await consumeRateLimit({
      bucket: "checkout-ip",
      identifier: rateLimitIp,
      maxRequests: 12,
      windowSeconds: 600,
    });
    if (!ipLimit.allowed)
      return NextResponse.json(
        {
          error:
            "Çok fazla ödeme oturumu oluşturuldu. Lütfen daha sonra tekrar deneyin.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipLimit.retryAfterSeconds),
          },
        },
      );

    const globalLimit = await consumeRateLimit({
      bucket: "checkout-global",
      identifier: "checkout",
      maxRequests: 300,
      windowSeconds: 300,
    });
    if (!globalLimit.allowed)
      return NextResponse.json(
        {
          error:
            "Çok fazla ödeme oturumu oluşturuldu. Lütfen daha sonra tekrar deneyin.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(globalLimit.retryAfterSeconds),
          },
        },
      );

    const bodyResult = await readCheckoutJsonBody(req);
    if (!bodyResult.ok)
      return NextResponse.json(
        {
          error: bodyResult.tooLarge
            ? "Ödeme isteği çok büyük."
            : "Geçersiz ödeme isteği.",
        },
        { status: bodyResult.tooLarge ? 413 : 400 },
      );
    const body = bodyResult.body;
    const checkoutMode = body.checkoutMode === "member" ? "member" : "guest";
    let requestedEmail = normalizeEmail(body.userEmail);
    const requestedCouponCode = normalizeCouponCode(body.couponCode);
    const items = Array.isArray(body.items) ? body.items : [];
    const shippingAddress = body.shippingAddress || null;
    const expectedTotalAmount = Number(body.expectedTotalAmount);
    const contractVersion = String(body.contractVersion || "");

    if (
      body.contractAccepted !== true ||
      contractVersion !== DISTANCE_SALES_VERSION
    )
      return NextResponse.json(
        {
          code: "CONTRACT_ACCEPTANCE_REQUIRED",
          error:
            "Güncel Mesafeli Satış ve Ön Bilgilendirme koşullarını onaylamanız gerekiyor.",
        },
        { status: 400 },
      );
    if (!Number.isFinite(expectedTotalAmount) || expectedTotalAmount <= 0)
      return NextResponse.json(
        {
          code: "INVALID_EXPECTED_TOTAL",
          error: "Gösterilen sipariş toplamı doğrulanamadı.",
        },
        { status: 400 },
      );

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

    const idempotencyKey = String(req.headers.get("idempotency-key") || "").trim();
    if (
      idempotencyKey.length < 16 ||
      idempotencyKey.length > 128 ||
      !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)
    )
      return NextResponse.json(
        { error: "Geçerli bir Idempotency-Key başlığı zorunludur." },
        { status: 400 },
      );

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
    )
      return NextResponse.json(
        { error: "Teslimat adresi eksik." },
        { status: 400 },
      );

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

    const identityLimit = await consumeRateLimit({
      bucket: "checkout-identity",
      identifier: userId || requestedEmail || rateLimitIp,
      maxRequests: 6,
      windowSeconds: 600,
    });
    if (!identityLimit.allowed)
      return NextResponse.json(
        {
          error:
            "Çok fazla ödeme oturumu oluşturuldu. Lütfen daha sonra tekrar deneyin.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(identityLimit.retryAfterSeconds),
          },
        },
      );

    await releaseExpiredReservations();

    const identitySource =
      checkoutMode === "member" ? `member:${userId}` : `guest:${requestedEmail}`;
    const identityHash = crypto
      .createHmac("sha256", merchantKey)
      .update(identitySource)
      .digest("hex");
    const keyHash = sha256(idempotencyKey);
    const attemptHash = crypto.randomBytes(32).toString("hex");
    const requestFingerprint = sha256(
      stableSerialize({
        checkoutMode,
        couponCode: requestedCouponCode,
        contractAccepted: true,
        contractVersion,
        email: requestedEmail,
        expectedTotalAmount: roundMoney(expectedTotalAmount),
        items: [...cartLines]
          .sort(
            (left, right) =>
              left.productId - right.productId ||
              Number(left.variantId || 0) - Number(right.variantId || 0),
          )
          .map((line) => ({
            id: line.productId,
            quantity: line.quantity,
            variantId: line.variantId,
          })),
        shippingAddress: shippingAddress
          ? {
              addressTitle: shippingAddress.addressTitle ?? null,
              city: shippingAddress.city,
              district: shippingAddress.district,
              firstName: shippingAddress.firstName,
              fullAddress:
                shippingAddress.fullAddress ??
                shippingAddress.full_address ??
                shippingAddress.address,
              lastName: shippingAddress.lastName,
              neighborhood: shippingAddress.neighborhood,
              phone: normalizePhone(shippingAddress.phone),
            }
          : null,
      }),
    );
    const merchantOid = makeMerchantOid(identityHash, keyHash);
    idempotencyContext = {
      identityHash,
      keyHash,
      attemptHash,
      requestFingerprint,
    };

    const { data: claimData, error: claimError } = await supabaseAdmin.rpc(
      "claim_checkout_idempotency",
      {
        p_identity_hash: identityHash,
        p_key_hash: keyHash,
        p_attempt_hash: attemptHash,
        p_request_fingerprint: requestFingerprint,
        p_merchant_oid: merchantOid,
        p_lease_seconds: 300,
      },
    );
    if (claimError)
      throw new Error("Ödeme isteği güvenli şekilde kilitlenemedi.");

    const claim = (claimData || {}) as CheckoutIdempotencyClaim;
    if (claim.action === "completed") {
      const replayStatus = Number(claim.status || 200);
      return NextResponse.json(claim.response, {
        status:
          Number.isInteger(replayStatus) && replayStatus >= 100 && replayStatus <= 599
            ? replayStatus
            : 200,
        headers: { "Idempotency-Replayed": "true" },
      });
    }
    if (claim.action === "terminal")
      return NextResponse.json(
        {
          code: "PAYMENT_SESSION_FINISHED",
          error:
            "Bu ödeme oturumu sonuçlandı. Yeni bir ödeme başlatmak için sipariş durumunuzu kontrol edin.",
        },
        { status: 409 },
      );
    if (claim.action === "conflict")
      return NextResponse.json(
        {
          code: "IDEMPOTENCY_KEY_REUSED",
          error: "Bu ödeme anahtarı farklı bir sepet için daha önce kullanıldı.",
        },
        { status: 409 },
      );
    if (claim.action === "expired")
      return NextResponse.json(
        {
          code: "IDEMPOTENCY_KEY_EXPIRED",
          error: "Ödeme isteğinin süresi doldu. Lütfen yeniden deneyin.",
        },
        { status: 409 },
      );
    if (claim.action === "in_progress") {
      const retryAfter = Math.max(1, Math.min(Number(claim.retry_after || 2), 300));
      return NextResponse.json(
        {
          code: "IDEMPOTENCY_IN_PROGRESS",
          error: "Bu ödeme isteği hâlen işleniyor. Lütfen kısa süre sonra tekrar deneyin.",
        },
        { status: 409, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    if (claim.action !== "acquired" || claim.merchant_oid !== merchantOid)
      throw new Error("Ödeme isteği kilidi doğrulanamadı.");

    const failIdempotently = async (
      payload: Record<string, unknown>,
      status: number,
      headers?: HeadersInit,
    ) => {
      await failCheckoutIdempotency(idempotencyContext);
      return NextResponse.json(payload, { status, headers });
    };

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
      return failIdempotently({ error: "Ürünler kontrol edilemedi." }, 500);

    // GÜVENLİK: Tüm fiyat, indirim, kargo ve toplam tutar hesaplamaları sunucu tarafında
    // bağımsız olarak yapılır. Client'tan gelen fiyat bilgilerine asla güvenilmez.
    // Client yalnızca ürün ID, miktar, adres ve kupon kodu gönderir.

    const { data: campaigns, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .select("*");
    if (campaignError)
      return failIdempotently(
        { error: "Güncel kampanya fiyatları doğrulanamadı." },
        500,
      );
    const nowIso = new Date().toISOString();

    if (products.length !== productIds.length) {
      return failIdempotently(
        { error: "Sepetteki ürünlerden biri bulunamadı." },
        400,
      );
    }

    if ((variants || []).length !== variantIds.length) {
      return failIdempotently(
        { error: "Sepetteki varyantlardan biri bulunamadı." },
        400,
      );
    }

    let checkedItems: Array<{
      id: number;
      name: string;
      price: number;
      quantity: number;
      variant_id?: number;
      variant_sku?: string;
      variant_options?: unknown;
      image: string;
      images: string[];
    }>;
    try {
      checkedItems = cartLines.map((line) => {
        const productId = line.productId;
        const product = (products as ProductRow[]).find(
          (row) => Number(row.id) === productId,
        );
        if (!product) throw new Error("Sepetteki ürünlerden biri bulunamadı.");

        const quantity = line.quantity;
        const productRequiresVariant = (activeProductVariants || []).some(
          (row) => Number(row.product_id) === productId,
        );
        if (productRequiresVariant && !line.variantId) {
          throw new Error(
            `${product.name} için bir ürün seçeneği seçilmelidir.`,
          );
        }
        const variant = line.variantId
          ? (variants || []).find(
              (row) =>
                Number(row.id) === line.variantId &&
                Number(row.product_id) === productId &&
                row.is_active !== false,
            )
          : null;
        if (line.variantId && !variant)
          throw new Error("Ürün varyantı geçersiz.");
        const availableStock = variant
          ? Number(variant.stock || 0)
          : Number(product.stock || 0);
        if (availableStock < quantity)
          throw new Error(`${product.name} stokta yetersiz.`);

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

        const basePrice =
          variant?.price == null
            ? Number(product.price)
            : Number(variant.price);
        const activePrice = getEffectiveUnitPrice({
          basePrice,
          discountPrice:
            variant?.price == null ? product.discount_price : undefined,
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
    } catch (error) {
      return failIdempotently(
        {
          code: "CART_CHANGED",
          error:
            error instanceof Error
              ? error.message
              : "Sepetteki ürünler doğrulanamadı.",
        },
        409,
      );
    }

    const subtotalAmount = roundMoney(
      checkedItems.reduce(
        (sum, item) =>
          sum + Number(item.price || 0) * Number(item.quantity || 1),
        0,
      ),
    );
    if (!Number.isFinite(subtotalAmount) || subtotalAmount <= 0)
      return failIdempotently({ error: "Geçersiz ödeme tutarı." }, 400);

    let couponValidation: Awaited<ReturnType<typeof validateCouponOnServer>>;
    try {
      couponValidation = await validateCouponOnServer({
        couponCode: requestedCouponCode,
        checkoutMode,
        userId,
        subtotal: subtotalAmount,
      });
    } catch (error) {
      return failIdempotently(
        {
          code: "COUPON_INVALID",
          error:
            error instanceof Error
              ? error.message
              : "Kupon artık kullanılamıyor.",
        },
        409,
      );
    }
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
      return failIdempotently({ error: "Geçersiz ödeme tutarı." }, 400);

    if (Math.round(expectedTotalAmount * 100) !== Math.round(totalAmount * 100))
      return failIdempotently(
        {
          code: "QUOTE_CHANGED",
          error:
            "Sepet fiyatı veya kargo tutarı değişti. Güncel toplamı görüp sözleşmeyi yeniden onaylayın.",
          quote: {
            subtotal_amount: subtotalAmount,
            coupon_discount_amount: couponDiscountAmount,
            shipping_fee: shippingFeeAmount,
            total_amount: totalAmount,
          },
        },
        409,
      );

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
    const debugOverride = process.env.PAYTR_DEBUG_ON;
    const debugOn =
      debugOverride === "1"
        ? "1"
        : debugOverride === "0"
          ? "0"
          : testMode === "1" || process.env.NODE_ENV !== "production"
            ? "1"
            : "0";
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
    const contractAcceptedAt = new Date().toISOString();
    const contractSnapshotHash = sha256(
      stableSerialize({
        version: contractVersion,
        acceptedAt: contractAcceptedAt,
        checkoutMode,
        userEmail: effectiveEmail,
        items: checkedItems,
        shippingAddress: shippingAddressForOrder,
        subtotalAmount,
        couponDiscountAmount,
        shippingFeeAmount,
        totalAmount,
      }),
    );

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
    params.append("iframe_v2", "1");
    params.append("iframe_v2_dark", "0");

    const paytrResponse = await fetch(
      "https://www.paytr.com/odeme/api/get-token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: AbortSignal.timeout(20_000),
      },
    );

    const paytrResult = await paytrResponse.json();
    if (paytrResult.status !== "success") {
      const errorPayload = {
        error: paytrResult.reason || "PayTR token alınamadı.",
      };
      const { data: completedError, error: completionError } =
        await supabaseAdmin.rpc("complete_checkout_idempotency", {
          p_identity_hash: identityHash,
          p_key_hash: keyHash,
          p_attempt_hash: attemptHash,
          p_request_fingerprint: requestFingerprint,
          p_response_status: 400,
          p_response_payload: errorPayload,
        });
      if (completionError)
        throw new Error("PayTR hatası güvenli şekilde kaydedilemedi.");
      return NextResponse.json(completedError || errorPayload, { status: 400 });
    }

    const paytrTokenValue = String(paytrResult.token || "");
    if (!paytrTokenValue)
      throw new Error("PayTR geçerli bir ödeme tokenı döndürmedi.");

    const successPayload = {
      token: paytrTokenValue,
      merchant_oid: merchantOid,
      tracking_token: trackingToken,
      iframe_url: `https://www.paytr.com/odeme/guvenli/${paytrTokenValue}`,
      coupon: appliedCoupon
        ? { code: appliedCoupon.code, discount_amount: couponDiscountAmount }
        : null,
      subtotal_amount: subtotalAmount,
      total_after_coupon: subtotalAfterCoupon,
      shipping_fee: shippingFeeAmount,
      free_shipping_threshold: shippingSettings.free_shipping_threshold,
      total_amount: totalAmount,
    };
    const otpConsumption =
      checkoutMode === "guest"
        ? getOtpConsumption(body.otpVerificationToken)
        : null;
    if (checkoutMode === "guest" && !otpConsumption)
      return failIdempotently(
        { error: "E-posta doğrulamasının süresi doldu. Lütfen yeniden doğrulayın." },
        409,
      );

    finalizationStarted = true;
    const { data: finalizedResponse, error: finalizeError } =
      await supabaseAdmin.rpc("finalize_idempotent_checkout_order", {
        p_identity_hash: identityHash,
        p_key_hash: keyHash,
        p_attempt_hash: attemptHash,
        p_request_fingerprint: requestFingerprint,
        p_order: {
          order_no: merchantOid,
          merchant_oid: merchantOid,
          user_id: checkoutMode === "member" ? userId : null,
          user_email: effectiveEmail,
          items: checkedItems,
          total_amount: totalAmount,
          shipping_address: shippingAddressForOrder,
          paytr_total_amount: paymentAmount,
          tracking_token_hash: trackingTokenHash,
          coupon_code: appliedCoupon?.code?.toUpperCase() || null,
          coupon_discount_amount:
            couponDiscountAmount > 0 ? couponDiscountAmount : null,
          contract_version: contractVersion,
          contract_accepted_at: contractAcceptedAt,
          contract_snapshot_hash: contractSnapshotHash,
        },
        p_response_payload: successPayload,
        p_otp_token_hash: otpConsumption?.tokenHash || null,
        p_otp_expires_at: otpConsumption?.expiresAt || null,
        p_coupon_id:
          appliedCoupon && userId && couponDiscountAmount > 0
            ? String(appliedCoupon.id)
            : null,
        p_coupon_user_id:
          appliedCoupon && userId && couponDiscountAmount > 0 ? userId : null,
        p_coupon_code:
          appliedCoupon && userId && couponDiscountAmount > 0
            ? appliedCoupon.code
            : null,
        p_coupon_discount_amount:
          appliedCoupon && userId && couponDiscountAmount > 0
            ? couponDiscountAmount
            : null,
      });

    if (finalizeError) {
      const databaseMessage = `${finalizeError.message || ""} ${
        finalizeError.details || ""
      }`;
      if (databaseMessage.includes("OTP_PROOF_ALREADY_CONSUMED"))
        return failIdempotently(
          { error: "E-posta doğrulaması daha önce kullanılmış veya süresi dolmuş." },
          409,
        );
      if (databaseMessage.includes("COUPON_"))
        return failIdempotently(
          { error: "Kupon kullanım limiti doldu veya kupon artık geçerli değil." },
          409,
        );
      if (
        databaseMessage.includes("STOCK") ||
        databaseMessage.includes("PRODUCT_NOT_FOUND") ||
        databaseMessage.includes("VARIANT_NOT_FOUND")
      )
        return failIdempotently(
          {
            error:
              "Sepetteki bir veya daha fazla ürün için yeterli stok kalmadı.",
          },
          409,
        );
      const { data: recoveredClaim } = await supabaseAdmin.rpc(
        "claim_checkout_idempotency",
        {
          p_identity_hash: identityHash,
          p_key_hash: keyHash,
          p_attempt_hash: attemptHash,
          p_request_fingerprint: requestFingerprint,
          p_merchant_oid: merchantOid,
          p_lease_seconds: 300,
        },
      );
      const recovered = (recoveredClaim || {}) as CheckoutIdempotencyClaim;
      if (recovered.action === "completed") {
        const recoveredStatus = Number(recovered.status || 200);
        return NextResponse.json(recovered.response, {
          status:
            Number.isInteger(recoveredStatus) &&
            recoveredStatus >= 100 &&
            recoveredStatus <= 599
              ? recoveredStatus
              : 200,
          headers: { "Idempotency-Replayed": "true" },
        });
      }
      return NextResponse.json(
        {
          code: "CHECKOUT_STATUS_UNCERTAIN",
          error:
            "Ödeme isteğinin durumu doğrulanıyor. Aynı sayfadan kısa süre sonra tekrar deneyin.",
        },
        { status: 503, headers: { "Retry-After": "3" } },
      );
    }

    if (!finalizedResponse || typeof finalizedResponse !== "object")
      return NextResponse.json(
        {
          code: "CHECKOUT_STATUS_UNCERTAIN",
          error:
            "Ödeme isteğinin durumu doğrulanıyor. Aynı sayfadan kısa süre sonra tekrar deneyin.",
        },
        { status: 503, headers: { "Retry-After": "3" } },
      );
    return NextResponse.json(finalizedResponse);
  } catch (err: unknown) {
    if (!finalizationStarted) await failCheckoutIdempotency(idempotencyContext);
    console.error("PayTR ödeme başlangıcı tamamlanamadı:", err);
    return NextResponse.json(
      finalizationStarted
        ? {
            code: "CHECKOUT_STATUS_UNCERTAIN",
            error:
              "Ödeme isteğinin durumu doğrulanıyor. Aynı sayfadan kısa süre sonra tekrar deneyin.",
          }
        : { error: "Ödeme şu anda başlatılamadı. Lütfen tekrar deneyin." },
      {
        status: 500,
        headers: finalizationStarted ? { "Retry-After": "3" } : undefined,
      },
    );
  }
}
