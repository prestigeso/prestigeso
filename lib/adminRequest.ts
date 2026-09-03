import "server-only";

import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionCookie } from "@/lib/adminAuth";
import { isTrustedAdminMutationRequest } from "@/lib/adminSecurity";

export { isTrustedAdminMutationRequest } from "@/lib/adminSecurity";

export async function isAdminRequest(req: NextRequest) {
  if (!isTrustedAdminMutationRequest(req)) return false;
  const secret = (process.env.ADMIN_COOKIE_SECRET || "").trim();
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value || "";
  return secret.length >= 32 && verifyAdminSessionCookie(secret, cookie);
}
