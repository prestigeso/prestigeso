import "server-only";

import crypto from "crypto";

export const IMAGE_MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

function hasPrefix(bytes: Uint8Array, expected: number[]) {
  return expected.every((value, index) => bytes[index] === value);
}

export async function validateImageFile(file: File, maxBytes: number) {
  if (!(file instanceof File) || file.size <= 0 || file.size > maxBytes) {
    throw new Error("Görsel boyutu geçersiz.");
  }

  const extension =
    IMAGE_MIME_EXTENSIONS[file.type as keyof typeof IMAGE_MIME_EXTENSIONS];
  if (!extension) {
    throw new Error("Yalnızca JPG, PNG, WEBP veya AVIF yüklenebilir.");
  }

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const valid =
    (file.type === "image/jpeg" && hasPrefix(bytes, [0xff, 0xd8, 0xff])) ||
    (file.type === "image/png" &&
      hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47])) ||
    (file.type === "image/webp" &&
      hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") ||
    (file.type === "image/avif" &&
      String.fromCharCode(...bytes.slice(4, 8)) === "ftyp");

  if (!valid) throw new Error("Dosya içeriği geçerli bir görsel değil.");
  return extension;
}

export function createImageObjectPath(prefix: string, extension: string) {
  const safePrefix = prefix
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, "-")
    .replace(/\.{2,}/g, "-")
    .replace(/^\/+|\/+$/g, "")
    .slice(0, 120);
  return `${safePrefix || "uploads"}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
}

export function storageObjectPathFromPublicUrl(value: unknown) {
  try {
    const url = new URL(String(value || ""));
    const expectedOrigin = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://invalid.supabase.co",
    ).origin;
    const prefix = "/storage/v1/object/public/products/";
    if (url.origin !== expectedOrigin || !url.pathname.startsWith(prefix)) {
      return null;
    }
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!path || path.includes("..") || path.startsWith("/")) return null;
    return path;
  } catch {
    return null;
  }
}
