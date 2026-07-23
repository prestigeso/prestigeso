import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const productId = Number(body.productId);
    if (!Number.isSafeInteger(productId) || productId <= 0)
      return NextResponse.json({ error: "Geçersiz ürün." }, { status: 400 });
    const limit = await consumeRateLimit({
      bucket: "product-view",
      identifier: `${getClientIp(req)}:${productId}`,
      maxRequests: 1,
      windowSeconds: 24 * 60 * 60,
    });
    if (!limit.allowed) return new NextResponse(null, { status: 204 });
    const { error } = await supabaseAdmin
      .from("product_views")
      .insert({ product_id: productId });
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
