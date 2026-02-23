import { NextResponse } from "next/server";

const COOKIE_NAME = "prestigeso_admin";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: COOKIE_NAME,
    value: "0",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return res;
}