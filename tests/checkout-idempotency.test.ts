import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("checkout client reuses one idempotency key across uncertain retries", async () => {
  const checkout = await source("../app/checkout/page.tsx");

  assert.match(checkout, /CHECKOUT_IDEMPOTENCY_STORAGE_KEY/);
  assert.match(checkout, /safeStorageGet\("session"/);
  assert.match(checkout, /storedIdempotency\?\.fingerprint === checkoutRequestFingerprint/);
  assert.match(checkout, /paymentInFlightRef\.current/);
  assert.match(checkout, /"Idempotency-Key": idempotencyKey/);
  assert.match(checkout, /response\.status >= 500/);
  assert.match(checkout, /response\.status === 429/);
  assert.match(checkout, /response\.status === 401/);
  assert.match(checkout, /result\?\.code === "IDEMPOTENCY_IN_PROGRESS"/);
  assert.match(checkout, /window\.location\.replace\(paymentUrl\.toString\(\)\)/);
});

test("checkout route scopes idempotency to identity and request fingerprint", async () => {
  const route = await source("../app/api/paytr/create-token/route.ts");

  assert.match(route, /createHmac\("sha256", merchantKey\)[\s\S]*identitySource/);
  assert.match(route, /stableSerialize\([\s\S]*checkoutMode[\s\S]*shippingAddress/);
  assert.match(
    route,
    /items: \[\.\.\.cartLines\][\s\S]*\.sort\([\s\S]*left\.productId - right\.productId/,
  );
  assert.match(route, /claim_checkout_idempotency/);
  assert.match(route, /IDEMPOTENCY_KEY_REUSED/);
  assert.match(route, /status: 409/);
  assert.match(route, /Idempotency-Replayed/);
  assert.match(route, /CHECKOUT_STATUS_UNCERTAIN/);
  assert.match(route, /expectedTotalAmount/);
  assert.match(route, /QUOTE_CHANGED/);
  assert.match(route, /contractSnapshotHash/);
});

test("checkout commits OTP, order, coupon, stock and response atomically", async () => {
  const route = await source("../app/api/paytr/create-token/route.ts");
  const migration = await source(
    "../supabase/migrations/20260823153000_checkout_idempotency.sql",
  );

  assert.match(route, /finalize_idempotent_checkout_order/);
  assert.doesNotMatch(route, /\.from\("orders"\)\s*\.insert/);
  assert.doesNotMatch(route, /consumeOtpProof\(/);

  assert.match(
    migration,
    /finalize_idempotent_checkout_order[\s\S]*insert into public\.otp_proof_consumptions[\s\S]*insert into public\.orders[\s\S]*reserve_order_coupon[\s\S]*reserve_order_stock[\s\S]*state = 'completed'/i,
  );
  assert.match(migration, /for update/i);
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(
    migration,
    /request_fingerprint <> p_request_fingerprint[\s\S]*'action', 'conflict'/i,
  );
  assert.match(
    migration,
    /state = 'completed'[\s\S]*'action', 'completed'[\s\S]*response_payload/i,
  );
  assert.match(
    migration,
    /state = 'processing' and v_row\.lease_expires_at > now\(\)[\s\S]*'action', 'in_progress'/i,
  );
  assert.match(migration, /attempt_hash = p_attempt_hash/i);
  assert.match(migration, /v_payment_status is distinct from 'pending'[\s\S]*'action', 'terminal'/i);
  assert.match(migration, /contract_snapshot_hash/i);
  assert.match(route, /AbortSignal\.timeout\(20_000\)/);
});

test("checkout idempotency storage is private and expires sensitive responses", async () => {
  const migration = await source(
    "../supabase/migrations/20260823153000_checkout_idempotency.sql",
  );

  assert.match(
    migration,
    /alter table public\.checkout_idempotency_keys enable row level security/i,
  );
  assert.match(
    migration,
    /revoke all on public\.checkout_idempotency_keys from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /response_payload = null[\s\S]*created_at < now\(\) - interval '400 days'/i,
  );
});
