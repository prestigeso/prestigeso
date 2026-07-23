import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createImageObjectPath,
  validateImageFile,
} from "@/lib/uploads/imageFiles";

export const runtime = "nodejs";
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

async function getUserId(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await auth.auth.getUser(token);
  return error ? null : data.user?.id || null;
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    orderId?: unknown;
    urls?: unknown;
  };
  const orderId = Number(body.orderId);
  const paths = (Array.isArray(body.urls) ? body.urls.slice(0, 3) : [])
    .map((value) => String(value || ""))
    .filter(
      (path): path is string =>
        Boolean(path) &&
        path.startsWith(`returns/${userId}/${orderId}/`) &&
        !path.includes(".."),
    );
  if (paths.length > 0)
    await supabaseAdmin.storage.from("return-evidence").remove(paths);
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

  const form = await req.formData();
  const orderId = Number(form.get("orderId"));
  const files = form.getAll("files").filter((value): value is File => value instanceof File);
  if (!Number.isSafeInteger(orderId) || orderId <= 0 || files.length > 3)
    return NextResponse.json({ error: "Geçersiz iade kanıtı." }, { status: 400 });

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("payment_status", "paid")
    .in("status", ["Teslim Edildi", "Tamamlandı"])
    .maybeSingle();
  if (!order)
    return NextResponse.json({ error: "Sipariş iade için uygun değil." }, { status: 409 });

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      const extension = await validateImageFile(file, MAX_EVIDENCE_BYTES);
      const path = createImageObjectPath(
        `returns/${userId}/${orderId}`,
        extension,
      );
      const { error } = await supabaseAdmin.storage.from("return-evidence").upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      uploaded.push(path);
    }
    return NextResponse.json({ urls: uploaded });
  } catch (error) {
    if (uploaded.length > 0)
      await supabaseAdmin.storage.from("return-evidence").remove(uploaded);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Kanıt yüklenemedi." },
      { status: 400 },
    );
  }
}
