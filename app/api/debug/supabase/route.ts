import { NextResponse } from "next/server";

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (!base || !key) {
    return NextResponse.json(
      { ok: false, error: "ENV eksik: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY" },
      { status: 500 }
    );
  }

  // ❗ Supabase REST kökü /rest/v1/ değil; tablo endpoint'i çağırıyoruz
  // RLS izinlerin varsa bu çağrı 200 döner.
  const url = `${base}/rest/v1/products?select=id,name,price,created_at&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    const text = await res.text().catch(() => "");

    return NextResponse.json({
      ok: true,
      requestUrl: url,
      status: res.status,
      statusText: res.statusText,
      body: text, // Supabase çoğu zaman JSON döner
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "SERVER fetch başarısız", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}