import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function authenticatedUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await auth.auth.getUser(token);
  return error ? null : data.user || null;
}

export async function GET(req: NextRequest) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const tables = [
    "customers",
    "addresses",
    "orders",
    "reviews",
    "questions",
    "messages",
    "favorites",
    "coupon_usages",
    "return_requests",
  ] as const;
  const results = await Promise.all(
    tables.map((table) =>
      supabaseAdmin
        .from(table)
        .select("*")
        .eq(table === "customers" ? "id" : "user_id", user.id),
    ),
  );
  const error = results.find((result) => result.error)?.error;
  if (error)
    return NextResponse.json({ error: "Veriler hazırlanamadı." }, { status: 500 });
  const exportData = Object.fromEntries(
    tables.map((table, index) => [table, results[index].data || []]),
  );
  return NextResponse.json(
    { exportedAt: new Date().toISOString(), accountEmail: user.email, ...exportData },
    {
      headers: {
        "Content-Disposition": `attachment; filename="prestigeso-verilerim-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function DELETE(req: NextRequest) {
  const user = await authenticatedUser(req);
  if (!user) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const { count, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("payment_status", "paid")
    .not("status", "in", '("Teslim Edildi","Tamamlandı","İptal Edildi","İade Edildi")');
  if (orderError)
    return NextResponse.json({ error: "Sipariş durumu doğrulanamadı." }, { status: 500 });
  if ((count || 0) > 0)
    return NextResponse.json(
      { error: "Aktif siparişiniz tamamlanmadan hesabınızı silemezsiniz." },
      { status: 409 },
    );
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (error)
    return NextResponse.json({ error: "Hesap silinemedi." }, { status: 500 });
  return NextResponse.json({ success: true });
}
