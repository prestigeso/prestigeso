import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const productId = Number(req.nextUrl.searchParams.get("productId"));
  if (!Number.isSafeInteger(productId) || productId <= 0)
    return NextResponse.json({ error: "Geçersiz ürün." }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .select("id,product_id,sku,barcode,option_values,price,stock,is_active")
    .eq("product_id", productId)
    .order("id");
  if (error)
    return NextResponse.json({ error: "Varyantlar yüklenemedi." }, { status: 500 });
  return NextResponse.json({ variants: data || [] });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const body = (await req.json()) as { productId?: unknown; variants?: unknown };
  const productId = Number(body.productId);
  const input = Array.isArray(body.variants) ? body.variants.slice(0, 100) : null;
  if (!Number.isSafeInteger(productId) || productId <= 0 || !input)
    return NextResponse.json({ error: "Geçersiz varyant verisi." }, { status: 400 });
  try {
    const rows = input.map((value) => {
      const row = value as Record<string, unknown>;
      const sku = String(row.sku || "").trim().slice(0, 100);
      const optionName = String(row.optionName || "").trim().slice(0, 60);
      const optionValue = String(row.optionValue || "").trim().slice(0, 100);
      const stock = Number(row.stock);
      const price = row.price === "" || row.price == null ? null : Number(row.price);
      if (
        !sku ||
        !optionName ||
        !optionValue ||
        !Number.isInteger(stock) ||
        stock < 0 ||
        (price !== null && (!Number.isFinite(price) || price < 0))
      )
        throw new Error("INVALID_VARIANT");
      return {
        ...(Number.isSafeInteger(Number(row.id)) && Number(row.id) > 0
          ? { id: Number(row.id) }
          : {}),
        product_id: productId,
        sku,
        barcode: String(row.barcode || "").trim().slice(0, 100) || null,
        option_values: { [optionName]: optionValue },
        price,
        stock,
        is_active: row.is_active !== false,
      };
    });
    const keepIds = rows.flatMap((row) => ("id" in row ? [row.id] : []));
    if (keepIds.length > 0) {
      const { data: ownedRows, error: ownershipError } = await supabaseAdmin
        .from("product_variants")
        .select("id")
        .eq("product_id", productId)
        .in("id", keepIds);
      if (ownershipError || (ownedRows || []).length !== keepIds.length)
        throw new Error("INVALID_VARIANT");
    }
    let remove = supabaseAdmin.from("product_variants").delete().eq("product_id", productId);
    if (keepIds.length > 0) remove = remove.not("id", "in", `(${keepIds.join(",")})`);
    const { error: removeError } = await remove;
    if (removeError) throw removeError;
    if (rows.length > 0) {
      const { error } = await supabaseAdmin
        .from("product_variants")
        .upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error && error.message === "INVALID_VARIANT"
      ? "Varyant alanları geçersiz."
      : "Varyantlar kaydedilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
