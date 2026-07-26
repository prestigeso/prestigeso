import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("registration consumes a signup OTP proof before creating an account", async () => {
  const route = await source("../app/api/auth/register/route.ts");
  assert.match(route, /verifyOtpProof\(body\.verificationToken, email, "signup"\)/);
  assert.match(route, /consumeOtpProof\(body\.verificationToken, email, "signup"\)/);
  assert.match(route, /auth\.admin\.createUser/);
  assert.match(route, /email_confirm:\s*true/);
});

test("review and admin media writes are server-side and validate file signatures", async () => {
  const reviewRoute = await source("../app/api/reviews/route.ts");
  const uploadRoute = await source("../app/api/admin/uploads/route.ts");
  const imageRules = await source("../lib/uploads/imageFiles.ts");
  assert.match(reviewRoute, /supabaseAdmin\.storage/);
  assert.match(uploadRoute, /isAdminRequest/);
  assert.match(imageRules, /hasPrefix\(bytes/);
});

test("maintenance endpoint requires a strong cron bearer secret", async () => {
  const route = await source("../app/api/maintenance/route.ts");
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /release_expired_stock_reservations/);
  assert.match(route, /prune_operational_data/);
});

test("PayTR reconciliation uses the official status-query token ingredients", async () => {
  const query = await source("../lib/paytr/queryStatus.ts");
  assert.match(query, /merchantId[\s\S]*merchantOid[\s\S]*merchantSalt/);
  assert.match(query, /https:\/\/www\.paytr\.com\/odeme\/durum-sorgu/);
  assert.match(query, /createHmac\("sha256", merchantKey\)/);
});

test("PayTR checkout uses the required iframe v2 integration", async () => {
  const checkout = await source("../app/api/paytr/create-token/route.ts");
  const layout = await source("../app/checkout/layout.tsx");
  const modal = await source(
    "../components/checkout/CheckoutPaymentModal.tsx",
  );
  assert.match(checkout, /params\.append\("iframe_v2", "1"\)/);
  assert.match(layout, /iframeResizer\.min\.js\?v2/);
  assert.match(modal, /iFrameResize/);
  assert.match(modal, /id="paytriframe"/);
  assert.match(modal, /scrolling:\s*true/);
  assert.match(modal, /overflow-y-auto/);
  assert.match(modal, /href=\{iframeUrl\}/);
  assert.match(modal, /Tam Sayfada Aç/);
});

test("variant checkout is validated server-side and reserved in SQL", async () => {
  const checkout = await source("../app/api/paytr/create-token/route.ts");
  const migration = await source(
    "../supabase/migrations/20260714100000_security_and_operations.sql",
  );
  assert.match(checkout, /from\("product_variants"\)/);
  assert.match(checkout, /productRequiresVariant && !line\.variantId/);
  assert.match(checkout, /variant\.stock/);
  assert.match(migration, /INSUFFICIENT_VARIANT_STOCK/);
  assert.match(migration, /variant_inventory_movements/);
});

test("return evidence is private and admin access uses signed URLs", async () => {
  const migration = await source(
    "../supabase/migrations/20260714100000_security_and_operations.sql",
  );
  const upload = await source("../app/api/orders/return-evidence/route.ts");
  const adminRead = await source("../app/api/admin/return-evidence/route.ts");
  assert.match(migration, /'return-evidence'[\s\S]*false/);
  assert.match(upload, /storage\.from\("return-evidence"\)/);
  assert.match(adminRead, /createSignedUrl\(path, 60\)/);
});

test("checkout is rate limited and guest OTP proofs are consumed once", async () => {
  const checkout = await source("../app/api/paytr/create-token/route.ts");
  const proof = await source("../lib/otpProof.ts");
  assert.match(checkout, /bucket: "checkout-ip"/);
  assert.match(checkout, /consumeOtpProof/);
  assert.match(proof, /jti: crypto\.randomBytes/);
  assert.match(proof, /consume_otp_proof/);
});
