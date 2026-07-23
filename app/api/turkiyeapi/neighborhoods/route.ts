import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const districtId = searchParams.get("districtId");
    const requestedLimit = Number(searchParams.get("limit") || 1000);
    const limit = Number.isSafeInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 1000)
      : 1000;

    if (!districtId || !/^\d{1,10}$/.test(districtId)) {
      return NextResponse.json(
        { status: "ERROR", message: "districtId is required" },
        { status: 400 },
      );
    }

    const rateLimit = await consumeRateLimit({
      bucket: "address-proxy-ip",
      identifier: getClientIp(request),
      maxRequests: 120,
      windowSeconds: 3600,
    });
    if (!rateLimit.allowed)
      return NextResponse.json(
        { status: "ERROR", message: "Rate limit exceeded" },
        { status: 429 },
      );

    const upstreamUrl = new URL("https://turkiyeapi.dev/api/v1/neighborhoods");
    upstreamUrl.searchParams.set("districtId", districtId);
    upstreamUrl.searchParams.set("limit", String(limit));
    const res = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 86400 }, // cache for 1 day
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch from turkiyeapi: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Neighborhoods proxy error:", error);
    return NextResponse.json(
      { status: "ERROR", message: "Failed to fetch neighborhoods" },
      { status: 500 },
    );
  }
}
