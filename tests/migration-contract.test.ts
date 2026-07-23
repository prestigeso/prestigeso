import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const integrityMigration = new URL(
  "../supabase/migrations/20260713180000_order_payment_integrity.sql",
  import.meta.url,
);
const initialMigration = new URL(
  "../supabase/migrations/20260713170000_initial_schema.sql",
  import.meta.url,
);
const reportingMigration = new URL(
  "../supabase/migrations/20260713190000_reporting_views.sql",
  import.meta.url,
);
const operationsMigration = new URL(
  "../supabase/migrations/20260714100000_security_and_operations.sql",
  import.meta.url,
);
const criticalFixesMigration = new URL(
  "../supabase/migrations/20260714120000_critical_checkout_fixes.sql",
  import.meta.url,
);
const launchReadinessMigration = new URL(
  "../supabase/migrations/20260723120000_launch_readiness.sql",
  import.meta.url,
);
const updatedAtRepairMigration = new URL(
  "../supabase/migrations/20260723130000_repair_updated_at_columns.sql",
  import.meta.url,
);

test("initial schema defines core commerce tables, constraints and indexes", async () => {
  const sql = await readFile(initialMigration, "utf8");
  for (const required of [
    "create table if not exists public.products",
    "create table if not exists public.orders",
    "create table if not exists public.coupons",
    "unique(order_id, coupon_id)",
    "check (rating between 1 and 5)",
    "create index if not exists orders_user_created_idx",
    "enable row level security",
  ])
    assert.match(sql, new RegExp(required.replace(/[()]/g, "\\$&"), "i"));
});

test("payment integrity migration defines required atomic RPCs and RLS", async () => {
  const sql = await readFile(integrityMigration, "utf8");
  for (const required of [
    "reserve_order_stock",
    "release_order_stock",
    "claim_order_post_payment",
    "register_order_coupon_usage",
    "consume_api_rate_limit",
    "verify_otp_code",
    "enable row level security",
  ])
    assert.match(sql, new RegExp(required));
});

test("stock, callback and coupon operations contain concurrency guards", async () => {
  const sql = await readFile(integrityMigration, "utf8");
  for (const required of [
    "for update",
    "order by (entry->>'id')::bigint",
    "for update skip locked",
    "on conflict (order_id, coupon_id) do nothing",
    "post_payment_processing_at > now() - interval '5 minutes'",
  ]) {
    assert.match(sql, new RegExp(required.replace(/[()]/g, "\\$&"), "i"));
  }
});

test("reporting migration aggregates reviews, engagement and daily admin metrics", async () => {
  const sql = await readFile(reportingMigration, "utf8");
  for (const required of [
    "product_review_stats",
    "product_engagement_stats",
    "get_admin_dashboard_totals",
    "admin_daily_order_stats",
    "admin_daily_visit_stats",
  ])
    assert.match(sql, new RegExp(required));
});

test("security and operations migration closes direct writes and adds operational foundations", async () => {
  const sql = await readFile(operationsMigration, "utf8");
  for (const required of [
    "alter table public.customers enable row level security",
    "customers_read_own",
    "addresses_read_own",
    "revoke insert on public.product_views",
    "storage.buckets",
    "inventory_movements",
    "product_variants",
    "return_requests",
    "prune_operational_data",
    "products_discount_not_above_price",
  ])
    assert.match(sql, new RegExp(required.replace(/[()]/g, "\\$&"), "i"));
});

test("critical checkout migration protects partial refunds, coupons, OTP and returns", async () => {
  const sql = await readFile(criticalFixesMigration, "utf8");
  for (const required of [
    "partially_refunded",
    "reserve_order_coupon",
    "release_order_coupon_reservation",
    "consume_otp_proof",
    "RETURN_QUANTITY_EXCEEDS_ORDER",
  ])
    assert.match(sql, new RegExp(required));
});

test("launch readiness migration rejects variant-less orders", async () => {
  const sql = await readFile(launchReadinessMigration, "utf8");
  assert.match(sql, /validate_order_variant_selection/);
  assert.match(sql, /VARIANT_REQUIRED/);
  assert.match(sql, /before insert or update of items on public\.orders/i);
});

test("updated-at repair supports databases created before the baseline schema", async () => {
  const sql = await readFile(updatedAtRepairMigration, "utf8");
  for (const table of [
    "products",
    "customers",
    "addresses",
    "orders",
    "site_settings",
  ]) {
    assert.match(
      sql,
      new RegExp(
        `alter table if exists public\\.${table}[\\s\\S]*?add column if not exists updated_at`,
        "i",
      ),
    );
  }
  assert.match(sql, /create or replace function public\.set_updated_at/i);
});
