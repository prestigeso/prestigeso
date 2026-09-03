import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MARKETING_CONSENT_VERSION } from "@/lib/legal/consent";
import { consumeRateLimit } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
const CONSENT_FIELDS =
  "id,marketing_consent,marketing_consent_at,marketing_consent_revoked_at,marketing_consent_version";

function json(
  body: Record<string, unknown>,
  init?: { status?: number; headers?: Record<string, string> },
) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

async function authenticatedUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data, error } = await auth.auth.getUser(token);
  return error ? null : data.user || null;
}

export async function POST(req: NextRequest) {
  const user = await authenticatedUser(req);
  if (!user) return json({ error: "Oturum gerekli." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.marketingConsent !== "boolean") {
    return json(
      { error: "Pazarlama izni tercihi geçersiz." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const consent = body.marketingConsent as boolean;

  // Revocation must always remain available. In particular, it must not share
  // the opt-in rate-limit bucket. Updating only a currently granted consent
  // also keeps repeated revocations idempotent (the original revoke time stays).
  if (!consent) {
    const { data: revoked, error: revokeError } = await supabaseAdmin
      .from("customers")
      .update({
        marketing_consent: false,
        marketing_consent_revoked_at: now,
        marketing_consent_version: MARKETING_CONSENT_VERSION,
      })
      .eq("id", user.id)
      .eq("marketing_consent", true)
      .select(CONSENT_FIELDS)
      .maybeSingle();

    if (revokeError) {
      return json(
        { error: "Pazarlama tercihi kaydedilemedi." },
        { status: 500 },
      );
    }
    if (revoked) return json({ consent: revoked });

    const { data: current, error: currentError } = await supabaseAdmin
      .from("customers")
      .select(CONSENT_FIELDS)
      .eq("id", user.id)
      .maybeSingle();
    if (currentError || !current) {
      return json(
        { error: "Pazarlama tercihi kaydedilemedi." },
        { status: 500 },
      );
    }
    return json({ consent: current });
  }

  const limit = await consumeRateLimit({
    bucket: "marketing-consent-user",
    identifier: user.id,
    maxRequests: 20,
    windowSeconds: 24 * 60 * 60,
  });
  if (!limit.allowed) {
    return json(
      { error: "Çok fazla tercih değişikliği yapıldı." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("customers")
    .update({
      marketing_consent: true,
      marketing_consent_at: now,
      marketing_consent_revoked_at: null,
      marketing_consent_version: MARKETING_CONSENT_VERSION,
    })
    .eq("id", user.id)
    .select(CONSENT_FIELDS)
    .single();

  if (error) {
    return json(
      { error: "Pazarlama tercihi kaydedilemedi." },
      { status: 500 },
    );
  }

  return json({ consent: data });
}
