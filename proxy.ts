import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "prestigeso_admin";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Her zaman izin verilenler
  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/login";
  const isLogoutApi = pathname === "/api/admin/logout";

  if (isLoginPage || isLoginApi || isLogoutApi) {
    return NextResponse.next();
  }

  const isAdminPath = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminPath && !isAdminApi) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const authed = cookie === "1";

  if (isAdminApi && !authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isAdminPath && !authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};