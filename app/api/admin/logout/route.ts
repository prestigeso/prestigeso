import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { isTrustedAdminMutationRequest } from "@/lib/adminRequest";

export async function POST(req: Request) {
  if (!isTrustedAdminMutationRequest(req)) {
    return NextResponse.json(
      { error: "Geçersiz istek kaynağı." },
      { status: 403 },
    );
  }

  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "0",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return res;
}
