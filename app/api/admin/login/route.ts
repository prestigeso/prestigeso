import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  ADMIN_COOKIE_NAME,
  createAdminSessionCookie,
} from "@/lib/adminAuth";
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
    const clientIp = getClientIp(req);
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

    const body = await req.json().catch(() => ({}));
    const passwordRaw = (body?.password ?? "").toString();

    const adminPassRaw = (process.env.ADMIN_PASSWORD ?? "").toString();
    const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();

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

    const isPasswordValid = timingSafeStringEqual(password, adminPass);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Kullanıcı adı veya şifre hatalı." },
        { status: 401 },
      );
    }

    const cookieValue = await createAdminSessionCookie(adminSecret);
    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: cookieValue,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
    });

    return res;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
}
