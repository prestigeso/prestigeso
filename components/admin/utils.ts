import { supabase } from "@/lib/supabase";

export const STORAGE_BUCKET = "products";

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function revokeUrls(urls: string[]) {
  urls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  });
}

function sanitizePrefix(prefix: string) {
  return String(prefix || "product")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "product";
}

function createRandomFileName(file: File, prefix: string) {
  const safePrefix = sanitizePrefix(prefix);
  const ext = ALLOWED_IMAGE_TYPES[file.type];

  if (!ext) {
    throw new Error("Desteklenmeyen görsel formatı. Sadece JPG, PNG, WEBP veya AVIF yükleyebilirsiniz.");
  }

  const randomPart = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${safePrefix}/${Date.now()}-${randomPart}.${ext}`;
}

function validateImageFile(file: File) {
  if (!file) {
    throw new Error("Dosya bulunamadı.");
  }

  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    throw new Error("Sadece JPG, PNG, WEBP veya AVIF formatında görsel yükleyebilirsiniz. SVG/HTML kabul edilmez.");
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Her görsel en fazla ${MAX_IMAGE_SIZE_MB} MB olmalıdır.`);
  }

  if (file.size <= 0) {
    throw new Error("Boş dosya yüklenemez.");
  }
}

export async function uploadToStorageAndGetPublicUrl(file: File, prefix: string) {
  validateImageFile(file);

  const fileName = createRandomFileName(file, prefix);

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });

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
  if (Array.isArray(ids)) {
    return ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  }

  if (typeof ids === "string") {
    try {
      const parsed = JSON.parse(ids);

      if (Array.isArray(parsed)) {
        return parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x));
      }
    } catch {
      return [];
    }
  }

  return [];
}
