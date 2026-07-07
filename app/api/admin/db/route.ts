import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminAuth";

export const runtime = "nodejs";

// GÜVENLİK: Bu endpoint hem proxy.ts middleware hem de kendi cookie doğrulaması ile korunur.
// Defense-in-depth: Proxy atlatılsa bile supabaseAdmin erişimi güvende kalır.
// Tüm admin DB operasyonları bu route üzerinden supabaseAdmin (service role) ile yapılır.

async function getAdminErrorResponse(req: NextRequest): Promise<NextResponse | null> {
  const adminSecret = (process.env.ADMIN_COOKIE_SECRET || "").trim();
  const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value || "";

  if (!adminSecret || adminSecret.length < 32) {
    return NextResponse.json(
      { error: "Admin oturum yapılandırması eksik." },
      { status: 500 }
    );
  }

  const isValid = await verifyAdminSessionCookie(adminSecret, cookieValue);

  if (!isValid) {
    return NextResponse.json(
      { error: "Admin oturumu geçersiz veya süresi dolmuş." },
      { status: 401 }
    );
  }

  return null;
}

type AdminOperation = {
  action: "select" | "insert" | "update" | "delete" | "upsert";
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  filters?: { column: string; op: "eq" | "neq" | "in"; value: unknown }[];
  select?: string;
  order?: { column: string; ascending: boolean };
  single?: boolean;
};

// İzin verilen tablolar — sadece bunlara erişim sağlanabilir
const ALLOWED_TABLES = new Set([
  "products",
  "categories",
  "campaigns",
  "hero_slides",
  "orders",
  "messages",
  "questions",
  "reviews",
  "favorites",
  "product_views",
  "page_views",
  "coupons",
  "coupon_usages",
]);

// Güncelleme/silme için izin verilen tablolar (okuma hariç)
const WRITE_ALLOWED_TABLES = new Set([
  "products",
  "categories",
  "campaigns",
  "hero_slides",
  "orders",
  "messages",
  "questions",
  "reviews",
]);

function isAllowedTable(table: string, isWrite: boolean): boolean {
  if (isWrite) return WRITE_ALLOWED_TABLES.has(table);
  return ALLOWED_TABLES.has(table);
}

export async function POST(req: NextRequest) {
  try {
    // Cookie doğrulaması — proxy middleware'e ek güvenlik katmanı
    const adminErrorResponse = await getAdminErrorResponse(req);
    if (adminErrorResponse) return adminErrorResponse;

    const body: AdminOperation = await req.json();
    const { action, table, data, filters, select: selectFields, order, single } = body;

    if (!action || !table) {
      return NextResponse.json({ error: "action ve table zorunludur." }, { status: 400 });
    }

    const isWrite = action !== "select";
    if (!isAllowedTable(table, isWrite)) {
      return NextResponse.json({ error: `Bu tabloda ${action} işlemi yapılamaz.` }, { status: 403 });
    }

    // SELECT
    if (action === "select") {
      let query = supabaseAdmin.from(table).select(selectFields || "*");

      if (filters) {
        for (const f of filters) {
          if (f.op === "eq") query = query.eq(f.column, f.value);
          else if (f.op === "neq") query = query.neq(f.column, f.value);
          else if (f.op === "in" && Array.isArray(f.value)) query = query.in(f.column, f.value);
        }
      }

      if (order) query = query.order(order.column, { ascending: order.ascending });

      if (single) {
        const { data: result, error } = await query.single();
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ data: result });
      }

      const { data: result, error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: result });
    }

    // INSERT
    if (action === "insert") {
      if (!data) return NextResponse.json({ error: "data zorunludur." }, { status: 400 });
      const insertData = Array.isArray(data) ? data : [data];
      const { data: result, error } = await supabaseAdmin
        .from(table)
        .insert(insertData)
        .select(selectFields || "*");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: result });
    }

    // UPDATE
    if (action === "update") {
      if (!data || !filters || filters.length === 0) {
        return NextResponse.json({ error: "data ve filters zorunludur." }, { status: 400 });
      }

      let query = supabaseAdmin.from(table).update(data as Record<string, unknown>);
      for (const f of filters) {
        if (f.op === "eq") query = query.eq(f.column, f.value);
        else if (f.op === "neq") query = query.neq(f.column, f.value);
      }

      const { data: result, error } = await query.select(selectFields || "*");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: result });
    }

    // DELETE
    if (action === "delete") {
      if (!filters || filters.length === 0) {
        return NextResponse.json({ error: "Filtresiz silme işlemi yapılamaz." }, { status: 400 });
      }

      let query = supabaseAdmin.from(table).delete();
      for (const f of filters) {
        if (f.op === "eq") query = query.eq(f.column, f.value);
      }

      const { error } = await query;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // UPSERT
    if (action === "upsert") {
      if (!data) return NextResponse.json({ error: "data zorunludur." }, { status: 400 });
      const upsertData = Array.isArray(data) ? data : [data];
      const { data: result, error } = await supabaseAdmin
        .from(table)
        .upsert(upsertData)
        .select(selectFields || "*");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: result });
    }

    return NextResponse.json({ error: "Geçersiz action." }, { status: 400 });
  } catch (err: any) {
    console.error("Admin DB operation error:", err);
    return NextResponse.json({ error: err?.message || "İşlem başarısız." }, { status: 500 });
  }
}
