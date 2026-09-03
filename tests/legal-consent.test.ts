import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  COOKIE_CONSENT_VERSION,
  parseCookieConsent,
} from "../lib/legal/consent.ts";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("cookie consent rejects legacy and malformed preference records", () => {
  assert.equal(parseCookieConsent(null), null);
  assert.equal(parseCookieConsent("not-json"), null);
  assert.equal(
    parseCookieConsent(
      JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: true,
        updatedAt: new Date().toISOString(),
      }),
    ),
    null,
  );
});

test("cookie consent accepts only the current explicit preference version", () => {
  const stored = {
    version: COOKIE_CONSENT_VERSION,
    necessary: true as const,
    analytics: true,
    marketing: false,
    updatedAt: "2026-08-23T00:00:00.000Z",
  };
  assert.deepEqual(parseCookieConsent(JSON.stringify(stored)), stored);
});

test("registration separates notice presentation from optional marketing consent", async () => {
  const page = await source("../app/login/page.tsx");
  const route = await source("../app/api/auth/register/route.ts");
  const agreement = await source("../app/uyelik-sozlesmesi/page.tsx");

  assert.doesNotMatch(page, /agreedPrivacy/);
  assert.doesNotMatch(route, /agreedPrivacy/);
  assert.match(page, /marketingConsent/);
  assert.match(route, /marketing_consent:\s*marketingConsent/);
  assert.match(agreement, /üyelik sözleşmesinin zorunlu bir parçası değildir/);
});
