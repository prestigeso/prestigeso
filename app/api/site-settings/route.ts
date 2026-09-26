import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeShippingSettings as normalizeSettings } from '@/lib/checkout/checkoutShipping';

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("key, value")
    .in("key", ["shipping", "marquee"]);

  if (error) {
    return NextResponse.json(
      { error: "Site ayarları şu anda alınamıyor." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const values = new Map((data || []).map((row) => [row.key, row.value]));

  return NextResponse.json(
    {
      shipping: normalizeSettings(values.get("shipping")),
      marquee: String(values.get("marquee") || "").slice(0, 200),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
