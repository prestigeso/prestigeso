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
  const reviewIpLimitStart = reviewRoute.indexOf('bucket: "review-create-ip"');
  const reviewAuthStart = reviewRoute.indexOf("auth.auth.getUser(token)");
  const reviewLimitStart = reviewRoute.indexOf('bucket: "review-create-user"');
  const reviewBodyStart = reviewRoute.indexOf("await readReviewFormData(req)");
  assert.ok(
    reviewIpLimitStart >= 0 && reviewIpLimitStart < reviewAuthStart,
    "IP rate limit'i değerlendirme auth çağrısından önce çalışmalı",
  );
  assert.ok(
    reviewAuthStart < reviewLimitStart && reviewLimitStart < reviewBodyStart,
    "kullanıcı rate limit'i auth sonrasında ve dosya gövdesinden önce çalışmalı",
  );
  assert.match(reviewRoute, /MAX_REVIEW_REQUEST_BYTES/);
  assert.match(reviewRoute, /req\.body\.getReader\(\)/);
  assert.match(reviewRoute, /receivedBytes > MAX_REVIEW_REQUEST_BYTES/);
  assert.match(reviewRoute, /new Response\(payload/);
  assert.match(reviewRoute, /status: 413/);
  assert.match(reviewRoute, /"Retry-After"/);
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

test("PayTR checkout uses one-time iframe v2 tokens in a top-level page", async () => {
  const checkout = await source("../app/api/paytr/create-token/route.ts");
  const checkoutPage = await source("../app/checkout/page.tsx");
  assert.match(checkout, /params\.append\("iframe_v2", "1"\)/);
  assert.match(checkoutPage, /paymentUrl\.hostname !== "www\.paytr\.com"/);
  assert.match(checkoutPage, /window\.location\.replace\(paymentUrl\.toString\(\)\)/);
  assert.doesNotMatch(checkoutPage, /CheckoutPaymentModal/);
});

test("variant checkout is validated server-side and reserved in SQL", async () => {
  const checkout = await source("../app/api/paytr/create-token/route.ts");
  const checkoutPage = await source("../app/checkout/page.tsx");
  const migration = await source(
    "../supabase/migrations/20260714100000_security_and_operations.sql",
  );
  assert.match(checkout, /from\("product_variants"\)/);
  assert.match(checkout, /productRequiresVariant && !line\.variantId/);
  assert.match(checkout, /variant\.stock/);
  assert.match(checkoutPage, /variant_id: item\.variant_id \?\? null/);
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

test("questions use a validated rate-limited server API and privacy-safe names", async () => {
  const route = await source("../app/api/questions/route.ts");
  const product = await source("../components/product/ProductDetailClient.tsx");
  const reviews = await source("../app/api/reviews/route.ts");
  const names = await source("../lib/customerDisplayNameValue.ts");
  assert.match(route, /bucket: "question-create-user"/);
  assert.match(route, /bucket: "question-create-ip"/);
  assert.match(route, /getCustomerDisplayName/);
  assert.match(product, /fetch\("\/api\/questions"/);
  assert.doesNotMatch(product, /from\("questions"\)\.insert/);
  assert.doesNotMatch(reviews, /email\?\.split\("@"\)/);
  assert.match(names, /return "Müşteri"/);
});

test("public product feedback hides auth identities and raw storage paths", async () => {
  const migration = await source(
    "../supabase/migrations/20260823143000_api_db_privacy_hardening.sql",
  );
  const productData = await source("../hooks/useProductDetailData.ts");
  const profile = await source("../app/profile/page.tsx");
  const reviewWrite = await source("../app/api/reviews/route.ts");
  const imageProxy = await source(
    "../app/api/review-images/[reviewId]/[index]/route.ts",
  );

  assert.match(
    migration,
    /revoke select on table public\.reviews from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /revoke select on table public\.questions from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /create or replace view public\.public_product_reviews[\s\S]*security_barrier = true[\s\S]*where review_row\.is_approved = true/i,
  );
  assert.match(
    migration,
    /create or replace view public\.public_product_questions[\s\S]*security_barrier = true[\s\S]*where question_row\.is_approved = true/i,
  );
  const publicReviewView = migration.slice(
    migration.indexOf("create or replace view public.public_product_reviews"),
    migration.indexOf("create or replace view public.public_product_questions"),
  );
  const publicQuestionView = migration.slice(
    migration.indexOf("create or replace view public.public_product_questions"),
    migration.indexOf("create or replace view public.my_product_reviews"),
  );
  assert.doesNotMatch(publicReviewView, /review_row\.user_id/);
  assert.doesNotMatch(publicQuestionView, /question_row\.user_id/);
  assert.match(
    migration,
    /grant select on table public\.my_product_reviews to authenticated/i,
  );
  assert.doesNotMatch(
    migration,
    /grant select on table public\.my_product_reviews to anon/i,
  );
  assert.match(migration, /\/api\/review-images\/%s\/%s/);
  assert.match(
    migration,
    /jsonb_array_elements_text\([\s\S]*to_jsonb\(review_row\.images\)/,
  );
  assert.match(
    migration,
    /to_jsonb\(request\.evidence_urls\)/,
  );
  assert.match(productData, /from\("public_product_reviews"\)/);
  assert.match(productData, /from\("public_product_questions"\)/);
  assert.doesNotMatch(productData, /from\("reviews"\)/);
  assert.doesNotMatch(productData, /from\("questions"\)/);
  assert.match(profile, /from\("my_product_reviews"\)/);
  assert.match(profile, /from\("my_product_questions"\)/);
  assert.doesNotMatch(profile, /from\("reviews"\)/);
  assert.doesNotMatch(profile, /from\("questions"\)/);
  assert.match(reviewWrite, /`reviews\/\$\{productId\}`/);
  assert.doesNotMatch(
    reviewWrite,
    /`reviews\/\$\{authData\.user\.id\}/,
  );
  assert.match(imageProxy, /\.eq\("is_approved", true\)/);
  assert.match(imageProxy, /storageObjectPathFromPublicUrl/);
  assert.match(imageProxy, /\.download\(path\)/);
  assert.match(imageProxy, /"X-Content-Type-Options": "nosniff"/);
});

test("marketing consent revocation is idempotent, uncached and never rate limited", async () => {
  const route = await source(
    "../app/api/account/marketing-consent/route.ts",
  );
  const revocationStart = route.indexOf("if (!consent)");
  const optInLimitStart = route.indexOf("const limit = await consumeRateLimit", revocationStart);
  assert.ok(revocationStart >= 0 && optInLimitStart > revocationStart);
  const revocationBranch = route.slice(revocationStart, optInLimitStart);

  assert.doesNotMatch(revocationBranch, /consumeRateLimit/);
  assert.match(revocationBranch, /\.eq\("marketing_consent", true\)/);
  assert.match(revocationBranch, /if \(revoked\) return json/);
  assert.match(route, /"Cache-Control": "no-store"/);
});

test("return evidence has atomic quota reservations and submitted-file protection", async () => {
  const route = await source("../app/api/orders/return-evidence/route.ts");
  const orderAction = await source("../app/api/orders/action/route.ts");
  const maintenance = await source("../app/api/maintenance/route.ts");
  const lifecycle = await source("../lib/returnEvidence.ts");
  const migration = await source(
    "../supabase/migrations/20260823143000_api_db_privacy_hardening.sql",
  );
  assert.match(route, /bucket: "return-evidence-user"/);
  assert.match(route, /bucket: "return-evidence-order"/);
  assert.match(route, /reserveReturnEvidenceUploads/);
  assert.match(orderAction, /create_return_request_with_evidence/);
  assert.match(migration, /for update/);
  assert.match(migration, /existing_count \+ requested_count > 3/);
  const quotaCount = migration.slice(
    migration.indexOf("select count(*) into existing_count"),
    migration.indexOf("if existing_count + requested_count > 3"),
  );
  assert.doesNotMatch(quotaCount, /deletion_started_at is null/);
  assert.match(migration, /RETURN_EVIDENCE_SUBMITTED/);
  assert.match(
    migration,
    /coalesce\(delivered_at, created_at\)[\s\S]*interval '14 days'/,
  );
  assert.match(migration, /claim_stale_return_evidence_uploads/);
  assert.match(migration, /interval '24 hours'/);
  assert.match(
    migration,
    /char_length\(evidence\.object_path\) between 20 and 500/,
  );
  assert.match(migration, /for update skip locked/);
  assert.match(migration, /deletion_claim_id = p_deletion_claim_id/);
  assert.match(route, /select\("id, created_at, delivered_at"\)/);
  assert.match(lifecycle, /complete_return_evidence_release/);
  assert.match(lifecycle, /cancel_return_evidence_release/);
  assert.match(maintenance, /cleanupStaleReturnEvidenceUploads\(100\)/);
  assert.doesNotMatch(
    orderAction,
    /error instanceof Error \? error\.message/,
  );
});

test("database hardening revokes direct question inserts and limits profile columns", async () => {
  const migration = await source(
    "../supabase/migrations/20260823143000_api_db_privacy_hardening.sql",
  );
  assert.match(
    migration,
    /revoke insert on table public\.questions from public, anon, authenticated/i,
  );
  assert.match(migration, /drop policy if exists questions_insert_own/i);
  assert.match(
    migration,
    /grant update \(first_name, last_name, full_name, phone, gender, birth_date\)/i,
  );
  assert.match(migration, /questions_product_approved_created_idx/i);
  assert.match(
    migration,
    /to_regclass\('public\.order_status_history'\)[\s\S]*alter table public\.order_status_history enable row level security/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.order_status_history from public, anon, authenticated/i,
  );
  assert.doesNotMatch(
    migration,
    /drop view if exists public\.(?:product_engagement_stats|product_review_stats|public_product_reviews)/i,
  );
  assert.match(
    migration,
    /create or replace view public\.product_review_stats/i,
  );
});

test("checkout is rate limited and guest OTP proofs are consumed atomically", async () => {
  const checkout = await source("../app/api/paytr/create-token/route.ts");
  const proof = await source("../lib/otpProof.ts");
  const migration = await source(
    "../supabase/migrations/20260823153000_checkout_idempotency.sql",
  );
  const checkoutIpLimitStart = checkout.indexOf('bucket: "checkout-ip"');
  const checkoutGlobalLimitStart = checkout.indexOf(
    'bucket: "checkout-global"',
  );
  const checkoutBodyStart = checkout.indexOf("await readCheckoutJsonBody(req)");
  const checkoutAuthStart = checkout.indexOf("supabaseAuth.auth.getUser");
  const checkoutIdentityLimitStart = checkout.indexOf(
    'bucket: "checkout-identity"',
  );
  assert.ok(
    checkoutIpLimitStart >= 0 &&
      checkoutIpLimitStart < checkoutGlobalLimitStart &&
      checkoutGlobalLimitStart < checkoutBodyStart,
    "checkout IP limiti global limitten, iki limit de body okumadan önce çalışmalı",
  );
  assert.doesNotMatch(
    checkout.slice(checkoutIpLimitStart, checkoutBodyStart),
    /Promise\.all/,
  );
  assert.ok(
    checkoutIpLimitStart < checkoutAuthStart &&
      checkoutAuthStart < checkoutIdentityLimitStart,
    "checkout IP limiti auth öncesinde, kimlik limiti auth sonrasında çalışmalı",
  );
  assert.match(checkout, /MAX_CHECKOUT_BODY_BYTES/);
  assert.match(checkout, /status: bodyResult\.tooLarge \? 413 : 400/);
  assert.match(checkout, /finalize_idempotent_checkout_order/);
  assert.match(proof, /jti: crypto\.randomBytes/);
  assert.match(migration, /insert into public\.otp_proof_consumptions/);
  assert.match(migration, /insert into public\.orders/);
});
