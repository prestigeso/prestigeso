import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const MAX_VIEWS_PER_IP = 50;
const TIME_WINDOW_MS = 60 * 60 * 1000; // 1 hour

type PageViewRecord = {
  count: number;
  resetAt: number;
};

const viewLimits = new Map<string, PageViewRecord>();

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function cleanupOldRecords() {
  const now = Date.now();
  for (const [ip, record] of viewLimits.entries()) {
    if (now > record.resetAt) {
      viewLimits.delete(ip);
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    cleanupOldRecords();

    const now = Date.now();
    let record = viewLimits.get(ip);

    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + TIME_WINDOW_MS };
      viewLimits.set(ip, record);
    }

    if (record.count >= MAX_VIEWS_PER_IP) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    record.count++;

    const { error } = await supabaseAdmin
      .from("page_views")
      .insert([{ created_at: new Date().toISOString() }]);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
