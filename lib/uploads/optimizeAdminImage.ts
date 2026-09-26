import sharp from "sharp";

export type OptimizedAdminImage = {
  body: Buffer;
  contentType: string;
  extension: string;
};

// Keep the source when transcoding would increase storage. Product photos are
// bounded at upload time so Next/Image does not have to fetch huge originals.
export async function optimizeAdminImage(
  source: Buffer,
  contentType: string,
  prefix: string,
): Promise<OptimizedAdminImage> {
  const maxWidth = prefix === "hero" ? 2400 : 1800;
  const image = sharp(source, { limitInputPixels: 40_000_000 }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Görsel boyutları okunamadı.");
  }

  const webp = await image
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  if (webp.length < source.length) {
    return { body: webp, contentType: "image/webp", extension: "webp" };
  }

  const extension =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/png"
        ? "png"
        : contentType === "image/avif"
          ? "avif"
          : "webp";
  return { body: source, contentType, extension };
}
