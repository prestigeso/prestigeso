import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { consumeRateLimit } from "@/lib/rateLimit";
import {
  releaseReturnEvidenceUploads,
  reserveReturnEvidenceUploads,
} from "@/lib/returnEvidence";
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
  const paths = (Array.isArray(body.urls) ? body.urls : [])
    .map((value) => String(value || ""))
    .filter(
      (path): path is string =>
        Boolean(path) &&
        path.startsWith(`returns/${userId}/${orderId}/`) &&
        !path.includes(".."),
    );
  if (
    !Number.isSafeInteger(orderId) ||
    orderId <= 0 ||
    paths.length === 0 ||
    paths.length > 3 ||
    new Set(paths).size !== paths.length
  )
    return NextResponse.json({ error: "Geçersiz iade kanıtı." }, { status: 400 });

  try {
    await releaseReturnEvidenceUploads({ orderId, userId, paths });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const submitted =
      message.includes("RETURN_EVIDENCE_SUBMITTED") ||
      message.includes("RETURN_EVIDENCE_NOT_REMOVABLE");
    return NextResponse.json(
      {
        error: submitted
          ? "İade talebine gönderilmiş kanıtlar silinemez."
          : "İade kanıtı silinemedi.",
      },
      { status: submitted ? 409 : 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });

  const form = await req.formData();
  const orderId = Number(form.get("orderId"));
  const files = form
    .getAll("files")
    .filter((value): value is File => value instanceof File);
  if (
    !Number.isSafeInteger(orderId) ||
    orderId <= 0 ||
    files.length === 0 ||
    files.length > 3
  )
    return NextResponse.json({ error: "Geçersiz iade kanıtı." }, { status: 400 });

  const [userLimit, orderLimit] = await Promise.all([
    consumeRateLimit({
      bucket: "return-evidence-user",
      identifier: userId,
      maxRequests: 8,
      windowSeconds: 3600,
    }),
    consumeRateLimit({
      bucket: "return-evidence-order",
      identifier: `${userId}:${orderId}`,
      maxRequests: 4,
      windowSeconds: 3600,
    }),
  ]);
  if (!userLimit.allowed || !orderLimit.allowed) {
    const retryAfterSeconds = Math.max(
      userLimit.allowed ? 0 : userLimit.retryAfterSeconds,
      orderLimit.allowed ? 0 : orderLimit.retryAfterSeconds,
    );
    return NextResponse.json(
      { error: "Çok fazla kanıt yükleme isteği yapıldı." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, created_at, delivered_at")
    .eq("id", orderId)
    .eq("user_id", userId)
    .eq("payment_status", "paid")
    .in("status", ["Teslim Edildi", "Tamamlandı"])
    .maybeSingle();
  if (!order)
    return NextResponse.json({ error: "Sipariş iade için uygun değil." }, { status: 409 });
  const returnWindowStartedAt = new Date(
    order.delivered_at || order.created_at,
  ).getTime();
  if (
    !Number.isFinite(returnWindowStartedAt) ||
    Date.now() > returnWindowStartedAt + 14 * 24 * 60 * 60 * 1000
  )
    return NextResponse.json(
      { error: "14 günlük iade talebi süresi dolmuş." },
      { status: 409 },
    );

  const uploaded: string[] = [];
  let reserved: string[] = [];
  try {
    const validatedFiles: Array<{ file: File; path: string }> = [];
    for (const file of files) {
      const extension = await validateImageFile(file, MAX_EVIDENCE_BYTES);
      validatedFiles.push({
        file,
        path: createImageObjectPath(
          `returns/${userId}/${orderId}`,
          extension,
        ),
      });
    }
    reserved = validatedFiles.map(({ path }) => path);
    const reservedSuccessfully = await reserveReturnEvidenceUploads({
      orderId,
      userId,
      paths: reserved,
    });
    if (!reservedSuccessfully) {
      return NextResponse.json(
        { error: "Bir sipariş için en fazla 3 iade kanıtı yüklenebilir." },
        { status: 409 },
      );
    }

    for (const { file, path } of validatedFiles) {
      const { error } = await supabaseAdmin.storage
        .from("return-evidence")
        .upload(path, file, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (error) throw error;
      uploaded.push(path);
    }
    return NextResponse.json({ urls: uploaded });
  } catch (error) {
    if (reserved.length > 0) {
      await releaseReturnEvidenceUploads({
        orderId,
        userId,
        paths: reserved,
      }).catch(async () => {
        if (uploaded.length > 0)
          await supabaseAdmin.storage.from("return-evidence").remove(uploaded);
      });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          /desteklenmiyor|boyutu|boş/i.test(error.message)
            ? error.message
            : "Kanıt yüklenemedi.",
      },
      { status: 400 },
    );
  }
}
