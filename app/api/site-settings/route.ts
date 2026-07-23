import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

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

function normalizeSettings(value: unknown): ShippingSettings {
  const source = value && typeof value === "object" ? value : {};
  const settings = source as Record<string, unknown>;

  const shippingFee = Number(
    settings.shipping_fee ?? DEFAULT_SHIPPING_SETTINGS.shipping_fee,
  );
  const freeShippingThreshold = Number(
    settings.free_shipping_threshold ??
      DEFAULT_SHIPPING_SETTINGS.free_shipping_threshold,
  );

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

export async function GET(): Promise<Response> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("key, value")
    .in("key", ["shipping", "marquee"]);

  if (error) {
    return NextResponse.json(
      { shipping: DEFAULT_SHIPPING_SETTINGS, marquee: "" },
      { status: 200 },
    );
  }

  const values = new Map((data || []).map((row) => [row.key, row.value]));

  return NextResponse.json({
    shipping: normalizeSettings(values.get("shipping")),
    marquee: String(values.get("marquee") || "").slice(0, 200),
  });
}
