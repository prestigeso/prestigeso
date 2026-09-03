export const ADMIN_PASSWORD_MIN_LENGTH = 16;
export const ADMIN_TOTP_MIN_SECRET_LENGTH = 32;
const SAFE_ADMIN_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

export function isStrongAdminPassword(value: string) {
  if (value.length < ADMIN_PASSWORD_MIN_LENGTH || value.length > 256) {
    return false;
  }

  return (
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export function normalizeTotpSecret(value: string) {
  return value.toUpperCase().replace(/[\s=-]/g, "");
}

export function isValidTotpSecret(value: string) {
  const normalized = normalizeTotpSecret(value);
  return (
    normalized.length >= ADMIN_TOTP_MIN_SECRET_LENGTH &&
    /^[A-Z2-7]+$/.test(normalized)
  );
}

export function isTrustedAdminMutationRequest(
  req: Request,
  configuredSiteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || "").trim(),
) {
  if (SAFE_ADMIN_METHODS.has(req.method.toUpperCase())) return true;

  const originHeader = req.headers.get("origin");
  if (!originHeader) return false;

  let requestOrigin: string;
  let suppliedOrigin: string;
  try {
    requestOrigin = new URL(req.url).origin;
    suppliedOrigin = new URL(originHeader).origin;
  } catch {
    return false;
  }

  const allowedOrigins = new Set([requestOrigin]);
  if (configuredSiteUrl) {
    try {
      allowedOrigins.add(new URL(configuredSiteUrl).origin);
    } catch {
      return false;
    }
  }

  if (!allowedOrigins.has(suppliedOrigin)) return false;

  const fetchSite = req.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin";
}
