import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  ADMIN_COOKIE_NAME,
  createAdminSessionCookie,
} from "@/lib/adminAuth";

export const runtime = "nodejs";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

type LoginAttemptRecord = {
  count: number;
  lockedUntil: number;
  lastAttemptAt: number;
};

const loginAttempts = new Map<string, LoginAttemptRecord>();

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = req.headers.get("x-real-ip");

  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function cleanupOldAttempts() {
  const now = Date.now();

  for (const [ip, record] of loginAttempts.entries()) {
    const isUnlocked = record.lockedUntil <= now;
    const isOld = now - record.lastAttemptAt > LOCK_TIME_MS;

    if (isUnlocked && isOld) {
      loginAttempts.delete(ip);
    }
  }
}

function getAttemptRecord(ip: string) {
  cleanupOldAttempts();

  const existing = loginAttempts.get(ip);

  if (existing) {
    return existing;
  }

  const fresh: LoginAttemptRecord = {
    count: 0,
    lockedUntil: 0,
    lastAttemptAt: 0,
  };

  loginAttempts.set(ip, fresh);
  return fresh;
}

function registerFailedAttempt(ip: string) {
  const now = Date.now();
  const record = getAttemptRecord(ip);

  const nextCount = record.count + 1;

  loginAttempts.set(ip, {
    count: nextCount,
    lockedUntil: nextCount >= MAX_FAILED_ATTEMPTS ? now + LOCK_TIME_MS : 0,
    lastAttemptAt: now,
  });
}

function clearAttempts(ip: string) {
  loginAttempts.delete(ip);
}

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
    const attemptRecord = getAttemptRecord(clientIp);
    const now = Date.now();

    if (attemptRecord.lockedUntil > now) {
      const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);

      return NextResponse.json(
        {
          error: "Çok fazla hatalı deneme yapıldı. Lütfen daha sonra tekrar deneyin.",
          retryAfterSeconds: remainingSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(remainingSeconds),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const passwordRaw = (body?.password ?? "").toString();

    const adminPassRaw = (process.env.ADMIN_PASSWORD ?? "").toString();
    const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();

    const password = passwordRaw.trim();
    const adminPass = adminPassRaw.trim();

    if (!adminPass) {
      return NextResponse.json(
        { error: "Server misconfigured: ADMIN_PASSWORD boş veya okunamadı" },
        { status: 500 }
      );
    }

    if (!adminSecret) {
      return NextResponse.json(
        { error: "Server misconfigured: ADMIN_COOKIE_SECRET boş veya okunamadı" },
        { status: 500 }
      );
    }

    if (adminSecret.length < 32) {
      return NextResponse.json(
        { error: "Server misconfigured: ADMIN_COOKIE_SECRET en az 32 karakter olmalı" },
        { status: 500 }
      );
    }

    const isPasswordValid = timingSafeStringEqual(password, adminPass);

    if (!isPasswordValid) {
      registerFailedAttempt(clientIp);

      return NextResponse.json(
        { error: "Wrong password" },
        { status: 401 }
      );
    }

    clearAttempts(clientIp);

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
  } catch (e: any) {
    return NextResponse.json(
      { error: "Bad request", details: e?.message },
      { status: 400 }
    );
  }
}
