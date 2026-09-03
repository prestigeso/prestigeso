export const TERMS_VERSION = "2026-08-23";
export const PRIVACY_NOTICE_VERSION = "2026-08-23";
export const MARKETING_CONSENT_VERSION = "2026-08-23";
export const DISTANCE_SALES_VERSION = "2026-08-23";

export const COOKIE_CONSENT_VERSION = "2026-08-23";
export const COOKIE_CONSENT_STORAGE_KEY = "prestigeso_cookie_consent";

export type CookieConsentPreferences = {
  version: string;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

export function parseCookieConsent(
  value: string | null,
): CookieConsentPreferences | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<CookieConsentPreferences>;
    if (
      parsed.version !== COOKIE_CONSENT_VERSION ||
      parsed.necessary !== true ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean" ||
      typeof parsed.updatedAt !== "string"
    ) {
      return null;
    }

    return parsed as CookieConsentPreferences;
  } catch {
    return null;
  }
}

export function applyCookieConsent(preferences: CookieConsentPreferences) {
  if (typeof document === "undefined") return;

  document.documentElement.dataset.consentAnalytics = String(
    preferences.analytics,
  );
  document.documentElement.dataset.consentMarketing = String(
    preferences.marketing,
  );
  window.dispatchEvent(
    new CustomEvent<CookieConsentPreferences>("prestigeso:consent-changed", {
      detail: preferences,
    }),
  );
}
