import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  isStrongAdminPassword,
  isTrustedAdminMutationRequest,
  isValidTotpSecret,
} from "../lib/adminSecurity.ts";
import { createAdminTotp, verifyAdminTotp } from "../lib/adminTotp.ts";
import {
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  createAdminSessionCookie,
  verifyAdminSessionCookie,
} from "../lib/adminAuth.ts";
import { getClientIp } from "../lib/clientIp.ts";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("production admin password policy rejects short or simple values", () => {
  assert.equal(isStrongAdminPassword("short"), false);
  assert.equal(isStrongAdminPassword("onlylowercasepassword1!"), false);
  assert.equal(isStrongAdminPassword("Strong-Admin-Password-42!"), true);
});

test("admin TOTP follows the RFC 6238 SHA-1 counter calculation", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  const timestamp = 59_000;

  assert.equal(isValidTotpSecret(secret), true);
  assert.equal(createAdminTotp(secret, timestamp), "287082");
  assert.equal(verifyAdminTotp("287082", secret, timestamp, 0), true);
  assert.equal(verifyAdminTotp("287083", secret, timestamp, 0), false);
});

test("admin sessions reject cookies issued before the MFA rollout", async () => {
  const secret = "admin-cookie-test-secret-at-least-32-characters";
  const currentCookie = await createAdminSessionCookie(secret);
  assert.equal(await verifyAdminSessionCookie(secret, currentCookie), true);

  const now = Date.now();
  const legacyPayload = Buffer.from(
    JSON.stringify({
      iat: now,
      exp: now + ADMIN_COOKIE_MAX_AGE_SECONDS * 1000,
      nonce: "legacy-cookie-nonce",
    }),
  ).toString("base64url");
  const legacySignature = createHmac("sha256", secret)
    .update(legacyPayload)
    .digest("base64url");
  assert.equal(
    await verifyAdminSessionCookie(
      secret,
      `${legacyPayload}.${legacySignature}`,
    ),
    false,
  );
});

test("admin login requires same-origin requests and production MFA", async () => {
  const requestGuard = await source("../lib/adminSecurity.ts");
  const loginRoute = await source("../app/api/admin/login/route.ts");

  assert.match(
    requestGuard,
    /return process\.env\.NODE_ENV === "production"/,
  );
  assert.doesNotMatch(requestGuard, /VERCEL_ENV/);
  assert.match(requestGuard, /origin/);
  assert.match(requestGuard, /sec-fetch-site/);
  assert.match(requestGuard, /fetchSite === "same-origin"/);
  assert.match(loginRoute, /isTrustedAdminMutationRequest/);
  assert.match(loginRoute, /ADMIN_TOTP_SECRET/);
  assert.match(loginRoute, /verifyAdminTotp/);
  assert.match(loginRoute, /isStrongAdminPassword/);
});

test("admin mutation origin guard rejects cross-site and missing origins", () => {
  assert.equal(
    isTrustedAdminMutationRequest(
      new Request("https://shop.example/api/admin/dashboard"),
      "https://shop.example",
    ),
    true,
  );
  assert.equal(
    isTrustedAdminMutationRequest(
      new Request("https://shop.example/api/admin/db", {
        method: "POST",
        headers: {
          origin: "https://shop.example",
          "sec-fetch-site": "same-origin",
        },
      }),
      "https://shop.example",
    ),
    true,
  );
  assert.equal(
    isTrustedAdminMutationRequest(
      new Request("https://shop.example/api/admin/db", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          "sec-fetch-site": "cross-site",
        },
      }),
      "https://shop.example",
    ),
    false,
  );
  assert.equal(
    isTrustedAdminMutationRequest(
      new Request("https://shop.example/api/admin/db", { method: "POST" }),
      "https://shop.example",
    ),
    false,
  );
});

test("Vercel rate limits ignore spoofable Cloudflare client headers", () => {
  const request = new Request("https://shop.example/api/admin/login", {
    headers: {
      "cf-connecting-ip": "203.0.113.9",
      "x-vercel-forwarded-for": "198.51.100.7",
    },
  });
  assert.equal(getClientIp(request, "vercel"), "198.51.100.7");
});

test("every state-changing admin route uses the common request guard", async () => {
  const mutationRoutes = [
    "../app/api/admin/coupons/route.ts",
    "../app/api/admin/db/route.ts",
    "../app/api/admin/login/route.ts",
    "../app/api/admin/logout/route.ts",
    "../app/api/admin/reconciliation/route.ts",
    "../app/api/admin/reviews/route.ts",
    "../app/api/admin/returns/route.ts",
    "../app/api/admin/site-settings/route.ts",
    "../app/api/admin/uploads/route.ts",
    "../app/api/admin/variants/route.ts",
    "../app/api/admin/orders/invoice/route.ts",
    "../app/api/admin/orders/refund/route.ts",
    "../app/api/admin/orders/send-email/route.ts",
  ];

  for (const route of mutationRoutes) {
    const routeSource = await source(route);
    assert.match(
      routeSource,
      /isAdminRequest|isTrustedAdminMutationRequest/,
      `${route} ortak admin güvenlik kontrolünü kullanmalı`,
    );
  }
});

test("PayTR debug output is not hard-coded on in production", async () => {
  const checkoutRoute = await source(
    "../app/api/paytr/create-token/route.ts",
  );

  assert.match(checkoutRoute, /PAYTR_DEBUG_ON/);
  assert.match(checkoutRoute, /process\.env\.NODE_ENV !== "production"/);
  assert.doesNotMatch(checkoutRoute, /const debugOn = "1"/);
});

test("admin TOTP setup generates a local random secret without writing files", async () => {
  const setupScript = await source("../scripts/generate-admin-totp.mjs");

  assert.match(setupScript, /crypto\.randomBytes\(20\)/);
  assert.match(setupScript, /otpauth:\/\/totp/);
  assert.match(setupScript, /ADMIN_TOTP_SECRET=/);
  assert.doesNotMatch(setupScript, /writeFile|appendFile|createWriteStream/);
});
