import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { logServerEvent } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const limit = await consumeRateLimit({
      bucket: "client-error-ip",
      identifier: getClientIp(req),
      maxRequests: 20,
      windowSeconds: 3600,
    });
    if (!limit.allowed) return new NextResponse(null, { status: 204 });

    const body = (await req.json()) as Record<string, unknown>;
    logServerEvent("error", "client_render_error", {
      message: String(body.message || "Unknown client error").slice(0, 500),
      digest: String(body.digest || "").slice(0, 100),
      path: String(body.path || "").slice(0, 300),
    });
  } catch {
    // Telemetry must never create another user-facing error.
  }
  return new NextResponse(null, { status: 204 });
}
