import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCustomerDisplayName } from "@/lib/customerDisplayName";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
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

    const body = (await req.json().catch(() => null)) as {
      productId?: unknown;
      question?: unknown;
    } | null;
    const productId = Number(body?.productId);
    const question =
      typeof body?.question === "string" ? body.question.trim() : "";
    if (
      !Number.isSafeInteger(productId) ||
      productId <= 0 ||
      question.length < 3 ||
      question.length > 2000
    )
      return NextResponse.json(
        { error: "Soru alanları geçersiz." },
        { status: 400 },
      );

    const clientIp = getClientIp(req);
    const [userLimit, ipLimit] = await Promise.all([
      consumeRateLimit({
        bucket: "question-create-user",
        identifier: authData.user.id,
        maxRequests: 8,
        windowSeconds: 3600,
      }),
      consumeRateLimit({
        bucket: "question-create-ip",
        identifier: clientIp,
        maxRequests: 30,
        windowSeconds: 3600,
      }),
    ]);
    if (!userLimit.allowed || !ipLimit.allowed) {
      const retryAfterSeconds = Math.max(
        userLimit.allowed ? 0 : userLimit.retryAfterSeconds,
        ipLimit.allowed ? 0 : ipLimit.retryAfterSeconds,
      );
      return NextResponse.json(
        { error: "Çok fazla soru gönderildi. Lütfen daha sonra tekrar deneyin." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSeconds) },
        },
      );
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("id", productId)
      .maybeSingle();
    if (productError) throw new Error(productError.message);
    if (!product)
      return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });

    const userName = await getCustomerDisplayName(authData.user.id);
    const { error } = await supabaseAdmin.from("questions").insert({
      product_id: productId,
      user_id: authData.user.id,
      user_name: userName,
      question,
      is_approved: false,
    });
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Question creation failed", error);
    return NextResponse.json(
      { error: "Soru kaydedilemedi." },
      { status: 500 },
    );
  }
}
