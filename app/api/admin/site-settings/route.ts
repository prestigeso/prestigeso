import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminRequest";
import {normalizeShippingSettings} from '@/lib/checkout/checkoutShipping';

export const runtime = "nodejs";


async function getAdminErrorResponse(
  req: NextRequest,
): Promise<NextResponse | null> {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json(
      { error: "Admin oturumu geçersiz veya süresi dolmuş." },
      { status: 401 },
    );
  }

  return null;
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
  if (hasShipping) {
    const raw=body.shipping;
    const money=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1000000&&Math.abs(value*100-Math.round(value*100))<0.00001;
    if (!money(raw.shipping_fee) || !(raw.free_shipping_threshold===null && raw.rules_version===2 || money(raw.free_shipping_threshold)) || typeof raw.shipping_enabled!=='boolean' || (raw.rules_version!==undefined&&raw.rules_version!==2)) {
      return NextResponse.json({error:'Kargo tutarları geçerli, negatif olmayan ve en fazla iki ondalıklı olmalı.'},{status:400});
    }
  }
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
