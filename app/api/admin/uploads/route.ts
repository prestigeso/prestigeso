import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createImageObjectPath,
  storageObjectPathFromPublicUrl,
  validateImageFile,
} from "@/lib/uploads/imageFiles";

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

    const extension = await validateImageFile(file, MAX_ADMIN_IMAGE_BYTES);
    const path = createImageObjectPath(`admin/${prefix}`, extension);
    const { error } = await supabaseAdmin.storage.from("products").upload(path, file, {
      contentType: file.type,
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
  const paths = values
    .map((value) => storageObjectPathFromPublicUrl(value))
    .filter((value): value is string => Boolean(value));
  if (paths.length === 0) return NextResponse.json({ success: true });
  const { error } = await supabaseAdmin.storage.from("products").remove(paths);
  if (error)
    return NextResponse.json({ error: "Görseller silinemedi." }, { status: 500 });
  return NextResponse.json({ success: true });
}
