# Studio interaction and automatic archive

## Implemented

- Analytics uses top-level view tabs, a right-aligned date selector, selectable metric headers and an interactive chart in the PrestigeSO neutral palette. The duplicate introductory text is removed.
- 24/48-hour ranges use hourly buckets; 7/14/28/30-day ranges use daily buckets. Totals reconcile to the existing report semantics. Existing 30-day behavioral retention is unchanged; no invented annual history.
- Trendyol order list reads the local `trendyol_package_mirror`, with server pagination/status/order-number filtering. This is the same application database, not the checkout `orders` table: payment and stock triggers must not run for marketplace imports.
- Entering orders automatically loads the archive then drives resumable synchronization in 5.5-second steps while the menu remains mounted. Leaving stops the client loop; returning resumes. This is not an always-on background scheduler.
- First sync scans the available recent history in <=14-day windows, within the provider's 3-month limit. Later syncs overlap the last completed window by five minutes. A fresh archive avoids provider reads for two minutes. Errors preserve displayed archived records; the explicit refresh button remains.
- Old minimal mirror rows can be enriched with operational order details. Only explicit projected fields are saved, not raw provider payload/customer IDs/email/tax IDs. Access stays service/admin-only. Existing site sales and inventory are untouched.
- Search Console automatically loads its default report on entering marketing; successful identical requests are reused for two minutes. Connection/status, cost records and mirror tools load when visible. Actions requiring an order ID, URL or unsaved input still require valid input; no refund/cancel/save action runs automatically.

## Activation

1. Existing phase2 provider migration must already be applied.
2. Run `supabase/migrations/20260923220000_trendyol_auto_archive.sql` in Supabase SQL Editor.
3. Ensure server-only `TRENDYOL_SYNC_ENABLED=1`, configured seller ID/API credentials and explicit `TRENDYOL_ENVIRONMENT=production` (or stage for testing). Never expose credentials through NEXT_PUBLIC variables.
4. Open Orders and allow the initial historical transfer to complete. The progress message distinguishes an ongoing import from a current archive. Older-than-provider-accessible orders require a separate seller export/import workflow.

## Validation and boundaries

TypeScript, targeted ESLint, 23 analytics/provider unit tests and isolated production build (83 routes) pass. Synthetic PostgreSQL verifies repeat migration, automatic job reuse, historical catch-up/freshness stop, package deduplication, stale revision rejection and restricted grants. All 36 synthetic browser tests pass across desktop Chromium, Android Chromium and iOS WebKit. They cover automatic archive loading, preserved data on failure, read-only details, mobile navigation, form drafts and metric/date interaction. Desktop marketing/finance and mobile performance screenshots were inspected.

Background cost-record reads no longer disable editing. Late responses for a different record key cannot authorize a save or replace the current draft; a delayed-response regression test covers this boundary.

No production migration, environment change, commit, push or deployment was performed. Live provider acceptance remains unverified. Build emits pre-existing generated CSS and nested workspace-root warnings.

References: https://support.google.com/youtube/answer/9717005 and https://developers.trendyol.com/docs/sipari%C5%9F-paketlerini-ak%C4%B1%C5%9F-ile-%C3%A7ekme
