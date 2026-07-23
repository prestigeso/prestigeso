import { safeParseIds } from "@/lib/utils";

export { safeParseIds };

export const STORAGE_BUCKET = "products";

const MAX_IMAGE_SIZE_MB = 8;
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
  return (
    String(prefix || "product")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "product"
  );
}

/**
 * Dosyanın ilk baytlarını okuyarak gerçek formatını doğrular.
 * Uzantı değiştirilerek gizlenmiş SVG/HTML/JS dosyalarını tespit eder.
 */
async function verifyMagicBytes(file: File): Promise<boolean> {
  const SIGNATURES: { type: string; bytes: number[] }[] = [
    { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
    { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
    { type: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header
    { type: "image/avif", bytes: [] }, // AVIF uses ftyp box, check separately
  ];

  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const header = new Uint8Array(buffer);

    // AVIF: bytes 4-8 should be "ftyp"
    if (file.type === "image/avif") {
      const ftyp = String.fromCharCode(
        header[4],
        header[5],
        header[6],
        header[7],
      );
      return ftyp === "ftyp";
    }

    const sig = SIGNATURES.find((s) => s.type === file.type);
    if (!sig || sig.bytes.length === 0) return false;

    return sig.bytes.every((byte, i) => header[i] === byte);
  } catch {
    return false;
  }
}

async function validateImageFile(file: File) {
  if (!file) {
    throw new Error("Dosya bulunamadı.");
  }

  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    throw new Error(
      "Sadece JPG, PNG, WEBP veya AVIF formatında görsel yükleyebilirsiniz. SVG/HTML kabul edilmez.",
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Her görsel en fazla ${MAX_IMAGE_SIZE_MB} MB olmalıdır.`);
  }

  if (file.size <= 0) {
    throw new Error("Boş dosya yüklenemez.");
  }

  // SEC-20/21: Magic bytes doğrulaması — dosya içeriğinin gerçekten beyan edilen format olduğunu kontrol et
  const isReal = await verifyMagicBytes(file);
  if (!isReal) {
    throw new Error(
      "Dosya içeriği beyan edilen formatla uyuşmuyor. Lütfen geçerli bir görsel dosyası yükleyin.",
    );
  }
}

export async function uploadToStorageAndGetPublicUrl(
  file: File,
  prefix: string,
) {
  await validateImageFile(file);

  const form = new FormData();
  form.set("file", file);
  form.set("prefix", sanitizePrefix(prefix));
  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const data = (await response.json()) as { url?: string; error?: string };
  if (!response.ok || !data.url)
    throw new Error(data.error || "Görsel yüklenemedi.");
  return data.url;
}

export async function deleteStorageUrls(urls: string[]) {
  const cleanUrls = [...new Set(urls.filter(Boolean))];
  if (cleanUrls.length === 0) return;
  const response = await fetch("/api/admin/uploads", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ urls: cleanUrls }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Storage görselleri silinemedi.");
  }
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
