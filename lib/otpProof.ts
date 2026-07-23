import "server-only";

import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type OtpPurpose = "guest_checkout" | "signup";

type OtpProofPayload = {
  email?: string;
  purpose?: string;
  exp?: number;
  jti?: string;
};

function getSecret() {
  const secret =
    process.env.OTP_PROOF_SECRET || process.env.ADMIN_COOKIE_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("OTP proof secret is not configured.");
  return secret;
}

export function normalizeOtpEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
}

export function isOtpPurpose(value: unknown): value is OtpPurpose {
  return value === "guest_checkout" || value === "signup";
}

export function hashOtpCode(email: string, purpose: OtpPurpose, code: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${purpose}:${email}:${code}`)
    .digest("hex");
}

export function createOtpProof(
  email: string,
  purpose: OtpPurpose,
  lifetimeSeconds = 600,
) {
  const payload = Buffer.from(
    JSON.stringify({
      email,
      purpose,
      exp: Math.floor(Date.now() / 1000) + lifetimeSeconds,
      jti: crypto.randomBytes(24).toString("base64url"),
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function readVerifiedOtpProof(
  token: unknown,
  email: string,
  purpose: OtpPurpose,
): OtpProofPayload | null {
  try {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature) return null;
    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest();
    const provided = Buffer.from(signature, "base64url");
    if (
      expected.length !== provided.length ||
      !crypto.timingSafeEqual(expected, provided)
    )
      return null;
    const value = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as OtpProofPayload;
    const valid =
      value.email === email &&
      value.purpose === purpose &&
      Number(value.exp) >= Math.floor(Date.now() / 1000);
    return valid ? value : null;
  } catch {
    return null;
  }
}

export function verifyOtpProof(
  token: unknown,
  email: string,
  purpose: OtpPurpose,
) {
  return Boolean(readVerifiedOtpProof(token, email, purpose));
}

export async function consumeOtpProof(
  token: unknown,
  email: string,
  purpose: OtpPurpose,
) {
  const value = readVerifiedOtpProof(token, email, purpose);
  if (!value?.jti || !value.exp) return false;
  const tokenHash = crypto.createHash("sha256").update(value.jti).digest("hex");
  const { data, error } = await supabaseAdmin.rpc("consume_otp_proof", {
    p_token_hash: tokenHash,
    p_expires_at: new Date(value.exp * 1000).toISOString(),
  });
  return !error && data === true;
}
