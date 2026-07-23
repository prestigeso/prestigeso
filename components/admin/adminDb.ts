// Admin DB operasyonlarını güvenli API route üzerinden yapan helper fonksiyon.
// Client-side anon key yerine sunucu tarafında supabaseAdmin (service role) kullanır.

type AdminDbFilter = {
  column: string;
  op: "eq" | "neq" | "in";
  value: unknown;
};

type AdminDbOptions = {
  action: "insert" | "update" | "delete";
  table: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
  filters?: AdminDbFilter[];
};

type AdminDbResult<T = unknown> = {
  data: T | null;
  error: string | null;
};

export async function adminDb<T = unknown>(
  options: AdminDbOptions,
): Promise<AdminDbResult<T>> {
  try {
    const response = await fetch("/api/admin/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Admin cookie gönder
      body: JSON.stringify(options),
    });

    const result = (await response.json()) as { data?: T; error?: string };

    if (!response.ok) {
      return { data: null, error: result?.error || "İşlem başarısız." };
    }

    return { data: result?.data ?? null, error: null };
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Ağ hatası.",
    };
  }
}
