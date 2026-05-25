import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminAuth";

export const runtime = "nodejs";

type CouponPayload = {
  code?: string;
  name?: string;
  description?: string | null;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
  min_order_amount?: number;
  max_discount_amount?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number;
  is_active?: boolean;
  is_member_only?: boolean;
};

function normalizeCouponCode(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 40);
}

function toNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

async function getAdminErrorResponse(req: NextRequest): Promise<NextResponse | null> {
  const adminSecret = (process.env.ADMIN_COOKIE_SECRET || "").trim();
  const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value || "";

  if (!adminSecret || adminSecret.length < 32) {
    return NextResponse.json(
      { error: "Admin oturum yapılandırması eksik." },
      { status: 500 }
    );
  }

  const isValid = await verifyAdminSessionCookie(adminSecret, cookieValue);

  if (!isValid) {
    return NextResponse.json(
      { error: "Admin oturumu geçersiz veya süresi dolmuş." },
      { status: 401 }
    );
  }

  return null;
}

function validateCouponPayload(payload: CouponPayload) {
  const code = normalizeCouponCode(payload.code);
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim();
  const discountType = payload.discount_type === "percent" ? "percent" : "fixed";
  const discountValue = toNumber(payload.discount_value, 0);
  const minOrderAmount = toNumber(payload.min_order_amount, 0);
  const maxDiscountAmount = toNullableNumber(payload.max_discount_amount);
  const usageLimitTotal = toNullableNumber(payload.usage_limit_total);
  const usageLimitPerUser = toNumber(payload.usage_limit_per_user, 1);

  if (!code) return { error: "Kupon kodu zorunludur." };
  if (!name) return { error: "Kupon adı zorunludur." };
  if (name.length > 80) return { error: "Kupon adı en fazla 80 karakter olabilir." };
  if (description.length > 250) return { error: "Açıklama en fazla 250 karakter olabilir." };

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { error: "İndirim değeri 0'dan büyük olmalıdır." };
  }

  if (discountType === "percent" && discountValue > 89) {
    return { error: "Yüzde indirim 1-89 arası olmalıdır." };
  }

  if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
    return { error: "Minimum sepet tutarı 0 veya daha büyük olmalıdır." };
  }

  if (maxDiscountAmount !== null && maxDiscountAmount < 0) {
    return { error: "Maksimum indirim tutarı 0 veya daha büyük olmalıdır." };
  }

  if (usageLimitTotal !== null && usageLimitTotal < 0) {
    return { error: "Toplam kullanım limiti 0 veya daha büyük olmalıdır." };
  }

  if (!Number.isFinite(usageLimitPerUser) || usageLimitPerUser < 1) {
    return { error: "Kullanıcı başı kullanım limiti en az 1 olmalıdır." };
  }

  const startsAt = payload.starts_at || null;
  const endsAt = payload.ends_at || null;

  if (startsAt && Number.isNaN(new Date(startsAt).getTime())) {
    return { error: "Başlangıç tarihi geçersiz." };
  }

  if (endsAt && Number.isNaN(new Date(endsAt).getTime())) {
    return { error: "Bitiş tarihi geçersiz." };
  }

  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    return { error: "Bitiş tarihi başlangıç tarihinden önce olamaz." };
  }

  return {
    data: {
      code,
      name,
      description: description || null,
      discount_type: discountType,
      discount_value: discountValue,
      min_order_amount: minOrderAmount,
      max_discount_amount: maxDiscountAmount,
      starts_at: startsAt,
      ends_at: endsAt,
      usage_limit_total: usageLimitTotal,
      usage_limit_per_user: usageLimitPerUser,
      is_active: payload.is_active !== false,
      is_member_only: payload.is_member_only !== false,
    },
  };
}

export async function GET(req: NextRequest): Promise<Response> {
  const adminErrorResponse = await getAdminErrorResponse(req);
  if (adminErrorResponse) return adminErrorResponse;

  const { data, error } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ coupons: data || [] });
}

export async function POST(req: NextRequest): Promise<Response> {
  const adminErrorResponse = await getAdminErrorResponse(req);
  if (adminErrorResponse) return adminErrorResponse;

  const body = await req.json().catch(() => ({}));
  const validated = validateCouponPayload(body);

  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("coupons")
    .insert([validated.data])
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Bu kupon kodu zaten kullanılıyor." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ coupon: data }, { status: 201 });
}

export async function PATCH(req: NextRequest): Promise<Response> {
  const adminErrorResponse = await getAdminErrorResponse(req);
  if (adminErrorResponse) return adminErrorResponse;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();

  if (!id) {
    return NextResponse.json({ error: "Kupon ID zorunludur." }, { status: 400 });
  }

  if (body.action === "toggle") {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("coupons")
      .select("id, is_active")
      .eq("id", id)
      .single();

    if (lookupError || !existing) {
      return NextResponse.json({ error: "Kupon bulunamadı." }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .update({ is_active: !existing.is_active })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ coupon: data });
  }

  const validated = validateCouponPayload(body);

  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("coupons")
    .update(validated.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Bu kupon kodu zaten kullanılıyor." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ coupon: data });
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const adminErrorResponse = await getAdminErrorResponse(req);
  if (adminErrorResponse) return adminErrorResponse;

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim();

  if (!id) {
    return NextResponse.json({ error: "Kupon ID zorunludur." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("coupons").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
