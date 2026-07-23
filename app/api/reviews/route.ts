import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { consumeRateLimit } from "@/lib/rateLimit";
import {
  createImageObjectPath,
  validateImageFile,
} from "@/lib/uploads/imageFiles";

export const runtime = "nodejs";
const MAX_REVIEW_IMAGES = 3;
const MAX_REVIEW_IMAGE_BYTES = 5 * 1024 * 1024;

function parseItems(value: unknown): Array<{ id?: unknown }> {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token)
    return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  if (authError || !authData.user)
    return NextResponse.json(
      { error: "Oturum doğrulanamadı." },
      { status: 401 },
    );

  const form = await req.formData().catch(() => null);
  if (!form)
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const productId = Number(form.get("productId"));
  const rating = Number(form.get("rating"));
  const comment = String(form.get("comment") || "")
    .trim()
    .slice(0, 2000);
  const files = form
    .getAll("images")
    .filter((value): value is File => value instanceof File);
  if (
    !Number.isSafeInteger(productId) ||
    productId <= 0 ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    comment.length < 3 ||
    files.length > MAX_REVIEW_IMAGES
  ) {
    return NextResponse.json(
      { error: "Değerlendirme alanları geçersiz." },
      { status: 400 },
    );
  }

  const { data: orders, error: ordersError } = await supabaseAdmin
    .from("orders")
    .select("items")
    .eq("user_id", authData.user.id)
    .eq("payment_status", "paid");
  if (ordersError)
    return NextResponse.json(
      { error: "Satın alma doğrulanamadı." },
      { status: 500 },
    );
  const purchased = (orders || []).some((order) =>
    parseItems(order.items).some((item) => Number(item.id) === productId),
  );
  if (!purchased)
    return NextResponse.json(
      { error: "Yalnızca satın aldığınız ürünleri değerlendirebilirsiniz." },
      { status: 403 },
    );

  const limit = await consumeRateLimit({
    bucket: "review-create-user",
    identifier: authData.user.id,
    maxRequests: 10,
    windowSeconds: 3600,
  });
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Çok fazla değerlendirme isteği yapıldı." },
      { status: 429 },
    );

  const uploadedPaths: string[] = [];
  try {
    const images: string[] = [];
    for (const file of files) {
      const extension = await validateImageFile(file, MAX_REVIEW_IMAGE_BYTES);
      const path = createImageObjectPath(
        `reviews/${authData.user.id}/${productId}`,
        extension,
      );
      const { error: uploadError } = await supabaseAdmin.storage
        .from("products")
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      const { data } = supabaseAdmin.storage.from("products").getPublicUrl(path);
      images.push(data.publicUrl);
    }

    const { error } = await supabaseAdmin.from("reviews").insert({
      product_id: productId,
      user_id: authData.user.id,
      user_name: authData.user.email?.split("@")[0] || "Kullanıcı",
      rating,
      comment,
      images,
      is_approved: false,
    });
    if (error) throw error;
  } catch (error: unknown) {
    if (uploadedPaths.length > 0)
      await supabaseAdmin.storage.from("products").remove(uploadedPaths);
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "";
    return NextResponse.json(
      {
        error:
          code === "23505"
            ? "Bu ürünü daha önce değerlendirdiniz."
            : "Değerlendirme kaydedilemedi.",
      },
      { status: code === "23505" ? 409 : 500 },
    );
  }
  return NextResponse.json({ success: true });
}
