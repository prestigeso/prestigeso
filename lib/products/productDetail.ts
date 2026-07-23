export type PurchasedItem = { id?: number | string };

export const MAX_REVIEW_IMAGES = 3;
export const MAX_REVIEW_IMAGE_SIZE_MB = 5;
export const MAX_REVIEW_IMAGE_SIZE_BYTES =
  MAX_REVIEW_IMAGE_SIZE_MB * 1024 * 1024;
export const ALLOWED_REVIEW_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function parsePurchasedItems(items: unknown): PurchasedItem[] {
  try {
    const parsed =
      typeof items === "string" ? JSON.parse(items || "[]") : items;
    return Array.isArray(parsed) ? (parsed as PurchasedItem[]) : [];
  } catch {
    return [];
  }
}

export function createSafeReviewFileName(
  file: File,
  productId: string | number,
) {
  const extension = ALLOWED_REVIEW_IMAGE_TYPES[file.type];
  if (!extension) {
    throw new Error(
      "Fotoğraflar JPG, PNG, WEBP veya AVIF formatında olmalıdır.",
    );
  }

  const randomPart = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `reviews/${productId}/${Date.now()}-${randomPart}.${extension}`;
}
