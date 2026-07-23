import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminAuth";

export const runtime = "nodejs";

type ShippingSettings = {
  shipping_fee: number;
  free_shipping_threshold: number;
  shipping_enabled: boolean;
};

async function getAdminErrorResponse(
  req: NextRequest,
): Promise<NextResponse | null> {
  const adminSecret = (process.env.ADMIN_COOKIE_SECRET || "").trim();
  const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value || "";

  if (!adminSecret || adminSecret.length < 32) {
    return NextResponse.json(
      { error: "Admin oturum yapılandırması eksik." },
      { status: 500 },
    );
  }

  const isValid = await verifyAdminSessionCookie(adminSecret, cookieValue);

  if (!isValid) {
    return NextResponse.json(
      { error: "Admin oturumu geçersiz veya süresi dolmuş." },
      { status: 401 },
    );
  }

  return null;
}

function toPositiveNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0
    ? Math.round(numberValue * 100) / 100
    : 0;
}

function normalizeShippingSettings(value: unknown): ShippingSettings {
  const body =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    shipping_fee: toPositiveNumber(body?.shipping_fee),
    free_shipping_threshold: toPositiveNumber(body?.free_shipping_threshold),
    shipping_enabled: body?.shipping_enabled !== false,
  };
}

export async function PATCH(req: NextRequest): Promise<Response> {
  const adminErrorResponse = await getAdminErrorResponse(req);
  if (adminErrorResponse) return adminErrorResponse;

  const body = await req.json().catch(() => ({}));
  const hasShipping = Boolean(body?.shipping);
  const hasMarquee = Object.prototype.hasOwnProperty.call(body, "marquee");
  if (!hasShipping && !hasMarquee) {
    return NextResponse.json(
      { error: "Kaydedilecek ayar bulunamadı." },
      { status: 400 },
    );
  }

  const shipping = hasShipping
    ? normalizeShippingSettings(body.shipping)
    : null;
  const marquee = hasMarquee
    ? String(body.marquee || "")
        .trim()
        .slice(0, 200)
    : null;
  const rows = [
    ...(shipping
      ? [
          {
            key: "shipping",
            value: shipping,
            updated_at: new Date().toISOString(),
          },
        ]
      : []),
    ...(hasMarquee
      ? [
          {
            key: "marquee",
            value: marquee,
            updated_at: new Date().toISOString(),
          },
        ]
      : []),
  ];

  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .upsert(rows, { onConflict: "key" })
    .select("key, value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const values = new Map((data || []).map((row) => [row.key, row.value]));
  return NextResponse.json({
    ...(shipping ? { shipping: values.get("shipping") || shipping } : {}),
    ...(hasMarquee
      ? { marquee: String(values.get("marquee") ?? marquee) }
      : {}),
  });
}
