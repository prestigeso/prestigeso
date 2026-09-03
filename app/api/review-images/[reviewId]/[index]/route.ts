import { NextRequest, NextResponse } from "next/server";
import { storageObjectPathFromPublicUrl } from "@/lib/uploads/imageFiles";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
const MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024;

const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function notFound() {
  return NextResponse.json(
    { error: "Görsel bulunamadı." },
    {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function storagePath(value: unknown) {
  const publicUrlPath = storageObjectPathFromPublicUrl(value);
  if (publicUrlPath) return publicUrlPath;

  const path = typeof value === "string" ? value : "";
  if (
    !path.startsWith("reviews/") ||
    path.startsWith("/") ||
    path.includes("..") ||
    path.length > 500
  ) {
    return null;
  }
  return path;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reviewId: string; index: string }> },
) {
  const { reviewId, index: rawIndex } = await params;
  if (!/^[1-9]\d{0,18}$/.test(reviewId) || !/^[0-2]$/.test(rawIndex)) {
    return notFound();
  }

  const { data: review, error: reviewError } = await supabaseAdmin
    .from("reviews")
    .select("images")
    .eq("id", reviewId)
    .eq("is_approved", true)
    .maybeSingle();

  if (reviewError || !review || !Array.isArray(review.images)) {
    return notFound();
  }

  const path = storagePath(review.images[Number(rawIndex)]);
  if (!path) return notFound();

  const { data: image, error: downloadError } = await supabaseAdmin.storage
    .from("products")
    .download(path);
  if (downloadError || !image || image.size > MAX_REVIEW_IMAGE_BYTES) {
    return notFound();
  }

  const extension = path.split(".").pop()?.toLowerCase() || "";
  const contentType = CONTENT_TYPES_BY_EXTENSION[extension];
  if (!contentType) return notFound();

  return new NextResponse(await image.arrayBuffer(), {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": contentType,
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
