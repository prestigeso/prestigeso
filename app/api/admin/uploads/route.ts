import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createImageObjectPath,
  storageObjectPathFromPublicUrl,
  validateImageFile,
} from "@/lib/uploads/imageFiles";
import { optimizeAdminImage } from "@/lib/uploads/optimizeAdminImage";
import {
  deleteR2ProductMedia,
  isR2ProductMediaEnabled,
  r2ProductMediaKeyFromUrl,
  uploadR2ProductMedia,
} from "@/lib/uploads/r2ProductMedia";

export const runtime = "nodejs";
const MAX_ADMIN_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const prefix = String(form.get("prefix") || "product");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });

    await validateImageFile(file, MAX_ADMIN_IMAGE_BYTES);
    const optimized = await optimizeAdminImage(
      Buffer.from(await file.arrayBuffer()),
      file.type,
      prefix,
    );
    const path = createImageObjectPath(`admin/${prefix}`, optimized.extension);
    if (isR2ProductMediaEnabled()) {
      const url = await uploadR2ProductMedia(path, optimized.body, optimized.contentType);
      return NextResponse.json({ url });
    }
    const { error } = await supabaseAdmin.storage.from("products").upload(path, optimized.body, {
      contentType: optimized.contentType,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabaseAdmin.storage.from("products").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Görsel yüklenemedi." },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { urls?: unknown };
  const values: unknown[] = Array.isArray(body.urls)
    ? body.urls.slice(0, 50)
    : [];
  const supabasePaths = values
    .map((value) => storageObjectPathFromPublicUrl(value))
    .filter((value): value is string => Boolean(value));
  const r2Keys = values
    .map((value) => r2ProductMediaKeyFromUrl(value))
    .filter((value): value is string => Boolean(value));
  try {
    if (r2Keys.length > 0) await deleteR2ProductMedia(r2Keys);
    // Preserve original Supabase media after cutover until a separate,
    // verified backup/cleanup is explicitly approved.
    if (supabasePaths.length > 0 && !isR2ProductMediaEnabled()) {
      const { error } = await supabaseAdmin.storage.from("products").remove(supabasePaths);
      if (error) throw error;
    }
  } catch {
    return NextResponse.json({ error: "Görseller silinemedi." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
