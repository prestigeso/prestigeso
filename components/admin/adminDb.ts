// Admin DB operasyonlarını güvenli API route üzerinden yapan helper fonksiyon.
// Client-side anon key yerine sunucu tarafında supabaseAdmin (service role) kullanır.

type AdminDbFilter = {
  column: string;
  op: "eq" | "neq" | "in";
  value: unknown;
};

type AdminDbOptions = {
  action: "select" | "insert" | "update" | "delete" | "upsert";
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  filters?: AdminDbFilter[];
  select?: string;
  order?: { column: string; ascending: boolean };
  single?: boolean;
};

type AdminDbResult<T = any> = {
  data: T | null;
  error: string | null;
};

export async function adminDb<T = any>(options: AdminDbOptions): Promise<AdminDbResult<T>> {
  try {
    const response = await fetch("/api/admin/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Admin cookie gönder
      body: JSON.stringify(options),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result?.error || "İşlem başarısız." };
    }

    return { data: result?.data ?? null, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || "Ağ hatası." };
  }
}
