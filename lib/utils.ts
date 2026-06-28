/**
 * Ortak yardımcı fonksiyonlar.
 * Birden fazla dosyada tekrarlanan utility'lerin tek kaynağı.
 */

/**
 * Kampanya product_ids alanını güvenle parse eder.
 * Array veya JSON string kabul eder, her zaman number[] döner.
 */
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

/**
 * SEC-18: Resim URL'lerini doğrular.
 * javascript:, data: gibi tehlikeli protokolleri engeller.
 * Geçersiz URL'ler için fallback döner.
 */
const SAFE_IMAGE_PROTOCOLS = ["https:", "http:"];
const FALLBACK_IMAGE = "/logo.jpeg";

export function sanitizeImageUrl(url: unknown, fallback = FALLBACK_IMAGE): string {
  if (!url || typeof url !== "string") return fallback;

  const trimmed = url.trim();

  // Relative paths are safe
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (SAFE_IMAGE_PROTOCOLS.includes(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    // invalid URL
  }

  return fallback;
}

/**
 * Para biçimlendirme. "1.234,56" formatında Türk Lirası gösterimi.
 * QUAL-03: 7+ dosyada tekrarlanan fonksiyonun tek kaynağı.
 */
export function formatMoney(value: unknown): string {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
