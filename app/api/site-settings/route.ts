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

function normalizeSettings(value: any): ShippingSettings {
  const source = value && typeof value === "object" ? value : {};

  const shippingFee = Number(source.shipping_fee ?? DEFAULT_SHIPPING_SETTINGS.shipping_fee);
  const freeShippingThreshold = Number(
    source.free_shipping_threshold ?? DEFAULT_SHIPPING_SETTINGS.free_shipping_threshold
  );

  return {
    shipping_fee: Number.isFinite(shippingFee) && shippingFee > 0 ? shippingFee : 0,
    free_shipping_threshold:
      Number.isFinite(freeShippingThreshold) && freeShippingThreshold > 0
        ? freeShippingThreshold
        : 0,
    shipping_enabled: source.shipping_enabled !== false,
  };
}

export async function GET(): Promise<Response> {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "shipping")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { shipping: DEFAULT_SHIPPING_SETTINGS },
      { status: 200 }
    );
  }

  return NextResponse.json({
    shipping: normalizeSettings(data?.value),
  });
}
