import "server-only";

import crypto from "crypto";
import { isIP } from "net";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export function getClientIp(req: Request) {
  const candidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0],
    req.headers.get("x-real-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && isIP(value)) return value;
  }
  return "unknown";
}

function hashIdentifier(value: string) {
  const secret =
    process.env.RATE_LIMIT_SECRET || process.env.ADMIN_COOKIE_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Rate limit secret is not configured.");
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

export async function consumeRateLimit({
  bucket,
  identifier,
  maxRequests,
  windowSeconds,
}: {
  bucket: string;
  identifier: string;
  maxRequests: number;
  windowSeconds: number;
}) {
  const { data, error } = await supabaseAdmin.rpc("consume_api_rate_limit", {
    p_bucket: bucket,
    p_identifier_hash: hashIdentifier(identifier),
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(`Rate limit kontrolü başarısız: ${error.message}`);
  const result = Array.isArray(data) ? data[0] : data;
  return {
    allowed: result?.allowed === true,
    retryAfterSeconds: Number(result?.retry_after_seconds || windowSeconds),
  };
}
