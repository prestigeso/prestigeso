import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminAuth";

export const runtime = "nodejs";

// GÜVENLİK: Bu endpoint hem proxy.ts middleware hem de kendi cookie doğrulaması ile korunur.
// Defense-in-depth: Proxy atlatılsa bile supabaseAdmin erişimi güvende kalır.
// Tüm admin DB operasyonları bu route üzerinden supabaseAdmin (service role) ile yapılır.

async function getAdminErrorResponse(
  req: NextRequest,
): Promise<NextResponse | null> {
  const adminSecret = (process.env.ADMIN_COOKIE_SECRET || "").trim();
  const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value || "";

  if (!adminSecret || adminSecret.length < 32) {
    return NextResponse.json(
      { error: "Admin oturum yapılandırması eksik." },
      { status: 500 },
    );
  }

  const isValid = await verifyAdminSessionCookie(adminSecret, cookieValue);

  if (!isValid) {
    return NextResponse.json(
      { error: "Admin oturumu geçersiz veya süresi dolmuş." },
      { status: 401 },
    );
  }

  return null;
}

type AdminOperation = {
  action: "insert" | "update" | "delete";
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  filters?: { column: string; op: "eq" | "neq" | "in"; value: unknown }[];
};

const WRITE_FIELDS: Record<string, Set<string>> = {
  products: new Set([
    "SKU",
    "name",
    "price",
    "category",
    "stock",
    "barcode",
    "is_bestseller",
    "description",
    "images",
    "image",
    "discount_price",
  ]),
  categories: new Set(["name", "slug"]),
  campaigns: new Set([
    "name",
    "discount_percent",
    "start_date",
    "end_date",
    "product_ids",
  ]),
  hero_slides: new Set(["image_url", "title", "subtitle", "category_slug"]),
  orders: new Set(["status", "shipping_carrier", "tracking_number"]),
  messages: new Set(["answer", "answered_at"]),
  questions: new Set(["answer", "answered_at", "is_approved"]),
  reviews: new Set(["is_approved"]),
};

function validateData(table: string, value: Record<string, unknown>) {
  const allowed = WRITE_FIELDS[table];
  if (!allowed) return false;
  const keys = Object.keys(value);
  if (keys.length === 0 || !keys.every((key) => allowed.has(key))) return false;

  const finiteNonNegative = (input: unknown) =>
    Number.isFinite(Number(input)) && Number(input) >= 0;
  if (table === "products") {
    if ("price" in value && !finiteNonNegative(value.price)) return false;
    if (
      "stock" in value &&
      (!Number.isInteger(Number(value.stock)) || Number(value.stock) < 0)
    )
      return false;
    if (
      "discount_price" in value &&
      !finiteNonNegative(value.discount_price)
    )
      return false;
    if ("name" in value && !String(value.name || "").trim().slice(0, 200))
      return false;
    if ("SKU" in value && !String(value.SKU || "").trim().slice(0, 100))
      return false;
  }
  if (table === "orders" && "status" in value) {
    const status = String(value.status);
    const allowedStatuses = new Set([
      "Bekliyor",
      "İşleniyor",
      "Hazırlanıyor",
      "Kargolandı",
      "Teslim Edildi",
      "Tamamlandı",
      "İade Talebi",
    ]);
    if (!allowedStatuses.has(status)) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Cookie doğrulaması — proxy middleware'e ek güvenlik katmanı
    const adminErrorResponse = await getAdminErrorResponse(req);
    if (adminErrorResponse) return adminErrorResponse;

    const body: AdminOperation = await req.json();
    const { action, table, data, filters } = body;

    if (!action || !table) {
      return NextResponse.json(
        { error: "action ve table zorunludur." },
        { status: 400 },
      );
    }

    if (!WRITE_FIELDS[table]) {
      return NextResponse.json(
        { error: `Bu tabloda ${action} işlemi yapılamaz.` },
        { status: 403 },
      );
    }

    // INSERT
    if (action === "insert") {
      if (!data)
        return NextResponse.json(
          { error: "data zorunludur." },
          { status: 400 },
        );
      const insertData = Array.isArray(data) ? data : [data];
      if (
        insertData.length > 20 ||
        !insertData.every((row) => validateData(table, row))
      ) {
        return NextResponse.json(
          { error: "Yazılabilir alanlar geçersiz." },
          { status: 400 },
        );
      }
      const { data: result, error } = await supabaseAdmin
        .from(table)
        .insert(insertData)
        .select("id");
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: result });
    }

    // UPDATE
    if (action === "update") {
      if (!data || !filters || filters.length === 0) {
        return NextResponse.json(
          { error: "data ve filters zorunludur." },
          { status: 400 },
        );
      }
      if (
        Array.isArray(data) ||
        !validateData(table, data) ||
        filters.some((filter) => filter.column !== "id" || filter.op !== "eq")
      ) {
        return NextResponse.json(
          { error: "Güncelleme alanları veya filtresi geçersiz." },
          { status: 400 },
        );
      }

      let query = supabaseAdmin
        .from(table)
        .update(data as Record<string, unknown>);
      for (const f of filters) {
        if (f.op === "eq") query = query.eq(f.column, f.value);
        else if (f.op === "neq") query = query.neq(f.column, f.value);
      }

      const { data: result, error } = await query.select("id");
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data: result });
    }

    // DELETE
    if (action === "delete") {
      if (!filters || filters.length === 0) {
        return NextResponse.json(
          { error: "Filtresiz silme işlemi yapılamaz." },
          { status: 400 },
        );
      }
      if (
        filters.some((filter) => filter.column !== "id" || filter.op !== "eq")
      ) {
        return NextResponse.json(
          { error: "Silme filtresi geçersiz." },
          { status: 400 },
        );
      }

      let query = supabaseAdmin.from(table).delete();
      for (const f of filters) {
        if (f.op === "eq") query = query.eq(f.column, f.value);
      }

      const { error } = await query;
      if (error)
        return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Geçersiz action." }, { status: 400 });
  } catch (err: unknown) {
    console.error("Admin DB operation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "İşlem başarısız." },
      { status: 500 },
    );
  }
}
