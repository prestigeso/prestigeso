import { NextRequest, NextResponse } from "next/server";
import {
  createOtpProof,
  hashOtpCode,
  isOtpPurpose,
  normalizeOtpEmail,
} from "@/lib/otpProof";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeOtpEmail(body.email);
    const purpose = body.purpose;
    const code = String(body.code || "").trim();
    if (!isOtpPurpose(purpose) || !/^\d{6}$/.test(code) || !email) {
      return NextResponse.json(
        { error: "Geçersiz doğrulama isteği." },
        { status: 400 },
      );
    }

    const limit = await consumeRateLimit({
      bucket: "otp-verify-ip",
      identifier: getClientIp(req),
      maxRequests: 20,
      windowSeconds: 900,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla doğrulama denemesi yapıldı." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const { data, error } = await supabaseAdmin.rpc("verify_otp_code", {
      p_email: email,
      p_purpose: purpose,
      p_code_hash: hashOtpCode(email, purpose, code),
      p_max_attempts: 5,
    });
    if (error) throw new Error(error.message);
    if (data !== true) {
      return NextResponse.json(
        { error: "Kod geçersiz, süresi dolmuş veya deneme hakkı tükenmiş." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "E-posta başarıyla doğrulandı.",
      verificationToken: createOtpProof(email, purpose),
    });
  } catch (error) {
    console.error("verify-otp unexpected error:", error);
    return NextResponse.json(
      { error: "Doğrulama tamamlanamadı." },
      { status: 500 },
    );
  }
}
