# Customer channel view

Customers now offers All / Store / Trendyol. All presents separate channel counts, never a cross-channel unique-person total. Store communication remains labeled as Store; selecting Trendyol hides site message/question/review panels and explains that the marketplace communication integration is not connected.

Trendyol buyer tracking uses a stable server-only HMAC key, scoped by seller/environment and provider customer ID. Raw customer ID/email is not persisted by this projection or returned to the browser. Earliest observed accepted order is retained across package repeats. Counts describe observed archive history, not all-time customer acquisition. Missing or empty buyer history is shown as unavailable, not fabricated as zero customers.

Activation (not performed in production):
1. Apply supabase/migrations/20260924150000_trendyol_buyers.sql.
2. Configure TRENDYOL_BUYER_HASH_SECRET with a cryptographically random server-only secret of at least 32 characters, identical in environments reading the same archive. Never expose through NEXT_PUBLIC or commit. Retain it; changing it without a migration would duplicate identities.
3. Restart the local process and rerun the approved historical import to populate buyer history. No buyer history was re-imported this turn. Future sync stores buyers only when the secret is configured; existing order sync stays compatible when absent.

Validation: typecheck, targeted lint, isolated production build, 14 buyer/provider unit tests, 3 targeted desktop/Android/iOS browser tests pass. Migration applied successfully only to local synthetic PostgreSQL. No push or live schema/environment changes.

Reference: https://developers.trendyol.com/docs/sipari%C5%9F-paketlerini-%C3%A7ekme-getshipmentpackages (customerId is a unique Trendyol customer account identifier).

## Subsequent authorized activation

On user approval, verified the live buyer table/function already existed (empty), generated a 48-byte random secret into ignored `.env.local` without displaying it, and re-imported the two-month modified-package window 2026-07-24T13:29:10.560Z through 2026-09-24T13:29:10.560Z. Five pages / 35 packages processed; 31 package order dates lie in that interval. Local authenticated customer-summary endpoint returned HTTP 200 with 33 observed Trendyol buyers and 0 store buyers for the 90-day report. This is observed archive coverage, not all-time unique people across channels. No Vercel settings, schema, push or deployment changed during activation.
