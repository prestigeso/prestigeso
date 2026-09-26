export const PRODUCTION_SITE_ORIGIN = "https://www.prestigeso.com.tr";

// SEO URLs must agree with the deployed primary domain, including when an old
// environment value still names the apex domain. Keep local/preview origins.
export function getSeoSiteOrigin(configured = process.env.NEXT_PUBLIC_SITE_URL): string {
  const value = configured?.trim();
  if (!value) return PRODUCTION_SITE_ORIGIN;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Invalid SEO site origin');
  }
  if (['prestigeso.com.tr', 'www.prestigeso.com.tr'].includes(url.hostname)) {
    return PRODUCTION_SITE_ORIGIN;
  }
  return url.origin;
}
