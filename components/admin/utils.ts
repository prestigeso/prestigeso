import { supabase } from "@/lib/supabase";

export const STORAGE_BUCKET = "products";

export function revokeUrls(urls: string[]) {
  urls.forEach((u) => {
    try {
      URL.revokeObjectURL(u);
    } catch {
      // ignore
    }
  });
}

export async function uploadToStorageAndGetPublicUrl(file: File, prefix: string) {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${prefix}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

// "1 dk önce", "2 saat önce" gibi
export function getTimeAgo(dateString?: string) {
  if (!dateString) return "Az önce";

  const now = new Date();
  const past = new Date(dateString);

  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Az önce";
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  return `${diffDays} gün önce`;
}

// campaigns.product_ids bazen array, bazen string JSON gelebiliyor -> güvenli parse
export function safeParseIds(ids: unknown): number[] {
  if (Array.isArray(ids)) return ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  if (typeof ids === "string") {
    try {
      const parsed = JSON.parse(ids);
      if (Array.isArray(parsed)) return parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    } catch {
      return [];
    }
  }
  return [];
}