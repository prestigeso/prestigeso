import { NextResponse } from "next/server";

export async function GET() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  return NextResponse.json({
    ok: true,
    hasUrl: !!url,
    hasAnonKey: !!key,
    urlPreview: url ? url.slice(0, 25) + "..." : null,
    keyPreview: key ? key.slice(0, 8) + "***" : null
  });
}