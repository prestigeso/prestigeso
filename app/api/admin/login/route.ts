import { NextResponse } from "next/server";

const COOKIE_NAME = "prestigeso_admin";

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

    const res = NextResponse.json({ ok: true });

    res.cookies.set({
      name: COOKIE_NAME,
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return res;
  } catch (e: any) {
    return NextResponse.json(
      { error: "Bad request", details: e?.message },
      { status: 400 }
    );
  }
}