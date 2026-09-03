import { isIP } from "node:net";

export function getClientIp(
  req: Request,
  platform: "vercel" | "generic" =
    process.env.VERCEL || process.env.VERCEL_ENV ? "vercel" : "generic",
) {
  const candidates =
    platform === "vercel"
      ? [
          req.headers.get("x-vercel-forwarded-for")?.split(",")[0],
          req.headers.get("x-real-ip"),
        ]
      : [
          req.headers.get("cf-connecting-ip"),
          req.headers.get("x-real-ip"),
          req.headers.get("x-forwarded-for")?.split(",")[0],
        ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && isIP(value)) return value;
  }
  return "unknown";
}
