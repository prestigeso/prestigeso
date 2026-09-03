import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  ADMIN_COOKIE_NAME,
  createAdminSessionCookie,
} from "@/lib/adminAuth";
import { isTrustedAdminMutationRequest } from "@/lib/adminRequest";
import {
  isProductionRuntime,
  isStrongAdminPassword,
  isValidTotpSecret,
} from "@/lib/adminSecurity";
import { verifyAdminTotp } from "@/lib/adminTotp";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

function timingSafeStringEqual(input: string, expected: string) {
  const inputBuffer = Buffer.from(input, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (inputBuffer.length !== expectedBuffer.length) {
    const maxLength = Math.max(inputBuffer.length, expectedBuffer.length, 1);
    const paddedInput = Buffer.alloc(maxLength);
    const paddedExpected = Buffer.alloc(maxLength);

    inputBuffer.copy(paddedInput);
    expectedBuffer.copy(paddedExpected);

    crypto.timingSafeEqual(paddedInput, paddedExpected);
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

export async function POST(req: Request) {
  try {
    if (!isTrustedAdminMutationRequest(req)) {
      return NextResponse.json(
        { error: "Geçersiz istek kaynağı." },
        { status: 403 },
      );
    }

    const clientIp = getClientIp(req);
    const rateLimit = await consumeRateLimit({
      bucket: "admin-login-ip",
      identifier: clientIp,
      maxRequests: 8,
      windowSeconds: 15 * 60,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Çok fazla hatalı deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const globalLimit = await consumeRateLimit({
      bucket: "admin-login-global",
      identifier: "admin-login",
      maxRequests: 100,
      windowSeconds: 15 * 60,
    });
    if (!globalLimit.allowed) {
      return NextResponse.json(
        { error: "Giriş geçici olarak sınırlandırıldı." },
        {
          status: 429,
          headers: { "Retry-After": String(globalLimit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
    const passwordRaw = (body?.password ?? "").toString();
    const totpCode = (body?.totpCode ?? "").toString();

    const adminPassRaw = (process.env.ADMIN_PASSWORD ?? "").toString();
    const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();
    const totpSecret = (process.env.ADMIN_TOTP_SECRET ?? "").trim();
    const isProduction = isProductionRuntime();

    const password = passwordRaw.trim();
    const adminPass = adminPassRaw.trim();

    if (!adminPass) {
      return NextResponse.json({ error: "Giriş başarısız." }, { status: 500 });
    }

    if (!adminSecret) {
      return NextResponse.json({ error: "Giriş başarısız." }, { status: 500 });
    }

    if (adminSecret.length < 32) {
      return NextResponse.json({ error: "Giriş başarısız." }, { status: 500 });
    }

    if (isProduction && !isStrongAdminPassword(adminPass)) {
      console.error("Admin parolası üretim güvenlik politikasını karşılamıyor.");
      return NextResponse.json(
        { error: "Admin güvenlik yapılandırması eksik." },
        { status: 503 },
      );
    }

    if (totpSecret && !isValidTotpSecret(totpSecret)) {
      console.error("ADMIN_TOTP_SECRET geçersiz.");
      return NextResponse.json(
        { error: "Admin güvenlik yapılandırması eksik." },
        { status: 503 },
      );
    }

    if (isProduction && !totpSecret) {
      console.error("ADMIN_TOTP_SECRET üretim ortamında zorunludur.");
      return NextResponse.json(
        { error: "Admin güvenlik yapılandırması eksik." },
        { status: 503 },
      );
    }

    const isPasswordValid = timingSafeStringEqual(password, adminPass);
    const isTotpValid = totpSecret
      ? verifyAdminTotp(totpCode, totpSecret)
      : !isProduction;

    if (!isPasswordValid || !isTotpValid) {
      return NextResponse.json(
        { error: "Şifre veya doğrulama kodu hatalı." },
        { status: 401 },
      );
    }

    const cookieValue = await createAdminSessionCookie(adminSecret);
    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: cookieValue,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
}
