export function parseR2PublicBaseUrl(value: string | undefined): URL | null {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("R2_PUBLIC_BASE_URL yalnızca HTTPS alan adı olmalıdır.");
  }
  if (
    url.hostname.endsWith(".r2.dev") ||
    url.hostname.endsWith(".r2.cloudflarestorage.com") ||
    url.hostname === "localhost" ||
    !url.hostname.includes(".")
  ) {
    throw new Error("R2_PUBLIC_BASE_URL üretim için özel bir alan adı olmalıdır.");
  }
  return url;
}

export function r2PublicUrlForKey(base: URL, key: string): string {
  if (!key || key.split("/").some((segment) =>
    !segment || segment === "." || segment === ".." || /[\\\x00-\x1f\x7f]/.test(segment)
  )) throw new Error("R2 nesne yolu geçersiz.");
  return new URL(
    key.split("/").map(encodeURIComponent).join("/"),
    base,
  ).toString();
}

export function r2KeyFromPublicUrl(base: URL | null, value: unknown): string | null {
  if (!base || typeof value !== "string") return null;
  try {
    // URL parsing normalizes encoded dot segments before pathname is inspected.
    if (/%(?:2e|2f|5c)/i.test(value)) return null;
    const url = new URL(value);
    if (url.origin !== base.origin || url.username || url.password || url.search || url.hash) return null;
    const key = decodeURIComponent(url.pathname.slice(1));
    const segments = key.split("/");
    if (
      segments.some(
        (segment) =>
          !segment || segment === "." || segment === ".." || /[\\\x00-\x1f\x7f]/.test(segment),
      )
    ) return null;
    return key;
  } catch {
    return null;
  }
}
