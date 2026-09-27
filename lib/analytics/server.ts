import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const ANALYTICS_COOKIE = "prestigeso_measurement";
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function secret() {
  // Rate limiting already permits this strong fallback. Keep visitor signing
  // consistent so an omitted optional rate-limit secret cannot orphan sessions.
  const value = [process.env.RATE_LIMIT_SECRET, process.env.ADMIN_COOKIE_SECRET]
    .find((candidate) => candidate && candidate.length >= 32);
  if (!value) throw new Error("ANALYTICS_CONFIGURATION");
  return value;
}
export function signVisitor(id: string) {
  const payload = `${id}.${Date.now() + 30 * 86400000}`;
  return `${payload}.${createHmac("sha256", secret()).update(`analytics-v1:${payload}`).digest("hex")}`;
}
export function readVisitor(req: NextRequest): string | null {
  try {
    const parts = (req.cookies.get(ANALYTICS_COOKIE)?.value || "").split(".");
    if (parts.length !== 3 || !uuidPattern.test(parts[0]) || !/^\d{13}$/.test(parts[1]) || Number(parts[1]) < Date.now() || !/^[a-f0-9]{64}$/.test(parts[2])) return null;
    const expected = createHmac("sha256", secret()).update(`analytics-v1:${parts[0]}.${parts[1]}`).digest("hex");
    return timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected)) ? parts[0] : null;
  } catch { return null; }
}
/** Optional: never let a measurement failure change checkout's result. */
export async function linkAnalyticsOrder(visitorId: string | null, context: unknown, merchantOid: string) {
  if (!visitorId || !context || typeof context !== "object") return;
  const c = context as Record<string, unknown>;
  if (![c.sessionId, c.cartId, c.attemptId].every((v) => typeof v === "string" && uuidPattern.test(v))) return;
  try {
    await supabaseAdmin.rpc("analytics_link_order", {
      p_visitor: visitorId, p_session: c.sessionId, p_cart: c.cartId,
      p_attempt: c.attemptId, p_merchant: merchantOid,
    }).abortSignal(AbortSignal.timeout(2000));
  } catch { /* optional attribution; financial order remains authoritative */ }
}
