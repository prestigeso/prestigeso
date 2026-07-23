import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  try {
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
    const res = await fetch("https://turkiyeapi.dev/api/v1/provinces", {
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
    console.error("Provinces proxy error:", error);
    return NextResponse.json(
      { status: "ERROR", message: "Failed to fetch provinces" },
      { status: 500 },
    );
  }
}
