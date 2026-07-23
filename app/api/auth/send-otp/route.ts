import crypto from "crypto";
import type { ReactElement } from "react";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { OtpEmail } from "@/components/emails/OtpEmail";
import { hashOtpCode, isOtpPurpose, normalizeOtpEmail } from "@/lib/otpProof";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function rateLimited(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: "Çok fazla kod isteği yapıldı. Lütfen daha sonra tekrar deneyin.",
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeOtpEmail(body.email);
    const purpose = body.purpose;
    if (!isValidEmail(email) || !isOtpPurpose(purpose)) {
      return NextResponse.json(
        { error: "Geçersiz doğrulama isteği." },
        { status: 400 },
      );
    }

    const ip = getClientIp(req);
    const globalLimit = await consumeRateLimit({
      bucket: "otp-send-global",
      identifier: "otp-send",
      maxRequests: 200,
      windowSeconds: 3600,
    });
    if (!globalLimit.allowed) return rateLimited(globalLimit.retryAfterSeconds);
    const ipLimit = await consumeRateLimit({
      bucket: "otp-send-ip",
      identifier: ip,
      maxRequests: 10,
      windowSeconds: 3600,
    });
    if (!ipLimit.allowed) return rateLimited(ipLimit.retryAfterSeconds);
    const emailLimit = await consumeRateLimit({
      bucket: "otp-send-email",
      identifier: email,
      maxRequests: 3,
      windowSeconds: 900,
    });
    if (!emailLimit.allowed) return rateLimited(emailLimit.retryAfterSeconds);

    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = hashOtpCode(email, purpose, code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data: inserted, error: dbError } = await supabaseAdmin
      .from("otp_verifications")
      .insert({
        email,
        code: codeHash,
        purpose,
        expires_at: expiresAt,
        is_used: false,
        attempt_count: 0,
      })
      .select("id")
      .single();
    if (dbError || !inserted)
      throw new Error(
        `OTP kaydedilemedi: ${dbError?.message || "bilinmeyen hata"}`,
      );

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        { error: "E-posta servisi yapılandırılmamış." },
        { status: 503 },
      );
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: `PrestigeSO <${process.env.RESEND_FROM_EMAIL}>`,
      to: [email],
      subject: `${code} - Doğrulama Kodunuz`,
      react: OtpEmail({ code }) as ReactElement,
    });
    if (result.error) {
      await supabaseAdmin
        .from("otp_verifications")
        .update({ is_used: true })
        .eq("id", inserted.id);
      throw new Error(`OTP e-postası gönderilemedi: ${result.error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: "Doğrulama kodu gönderildi.",
    });
  } catch (error) {
    console.error("send-otp unexpected error:", error);
    return NextResponse.json(
      { error: "Doğrulama kodu gönderilemedi." },
      { status: 500 },
    );
  }
}
