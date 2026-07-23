import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const parsedPage = Number.parseInt(
    req.nextUrl.searchParams.get("page") || "1",
    10,
  );
  const parsedLimit = Number.parseInt(
    req.nextUrl.searchParams.get("limit") || "25",
    10,
  );
  const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(50, Math.max(10, parsedLimit))
    : 25;
  const from = (page - 1) * limit;
  const { data, error, count } = await supabaseAdmin
    .from("reviews")
    .select(
      "id,product_id,user_id,user_name,rating,comment,images,is_approved,created_at,products(name,image,images)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);
  if (error)
    return NextResponse.json(
      { error: "Yorumlar yüklenemedi." },
      { status: 500 },
    );
  return NextResponse.json(
    { reviews: data || [], page, limit, total: count || 0 },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (!id)
    return NextResponse.json(
      { error: "Yorum kimliği gerekli." },
      { status: 400 },
    );
  const { error } = await supabaseAdmin
    .from("reviews")
    .update({ is_approved: true })
    .eq("id", id);
  return error
    ? NextResponse.json({ error: "Yorum güncellenemedi." }, { status: 500 })
    : NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id)
    return NextResponse.json(
      { error: "Yorum kimliği gerekli." },
      { status: 400 },
    );
  const { error } = await supabaseAdmin.from("reviews").delete().eq("id", id);
  return error
    ? NextResponse.json({ error: "Yorum silinemedi." }, { status: 500 })
    : NextResponse.json({ success: true });
}
