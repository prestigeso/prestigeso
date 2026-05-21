import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  ADMIN_COOKIE_NAME,
  createAdminSessionCookie,
} from "@/lib/adminAuth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const passwordRaw = (body?.password ?? "").toString();

    const adminPassRaw = (process.env.ADMIN_PASSWORD ?? "").toString();

    const password = passwordRaw.trim();
    const adminPass = adminPassRaw.trim();

    if (!adminPass) {
      return NextResponse.json(
        { error: "Server misconfigured: ADMIN_PASSWORD boş veya okunamadı" },
        { status: 500 }
      );
    }

    if (password !== adminPass) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();
    if (!adminSecret) {
      return NextResponse.json(
        { error: "Server misconfigured: ADMIN_COOKIE_SECRET boş veya okunamadı" },
        { status: 500 }
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
  } catch (e: any) {
    return NextResponse.json(
      { error: "Bad request", details: e?.message },
      { status: 400 }
    );
  }
}