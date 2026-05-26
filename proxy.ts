import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminAuth";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();
  if (!adminSecret) {
    return NextResponse.json(
      { error: "Server misconfigured: ADMIN_COOKIE_SECRET boş veya okunamadı" },
      { status: 500 }
    );
  }

  const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
  const authed = await verifyAdminSessionCookie(adminSecret, cookieValue);

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
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
