# Combined sales and authorized history import

- Finance now uses its own authenticated endpoint, reading paid site orders and archived Trendyol packages for 1/2/7/14/28/30/90/365 days. Behavioral analytics retains its existing 30-day policy.
- Trendyol accepted statuses: Created, Picking, Invoiced, Shipped, Delivered, AtCollectionPoint. Other statuses and non-TRY packages are excluded. Package IDs deduplicate money; order numbers deduplicate order counts. Cancelled and obsolete split packages do not inflate sales.
- Site reporting uses paid_at; Trendyol uses orderDate. Marketplace payout, commissions and customer-return monetary reconciliation are not available in this report. Coverage warning remains visible. Archived history is not a completeness guarantee.
- On explicit user authorization, imported modified packages from 2026-07-24T12:15:39.836Z through 2026-09-24T12:15:39.836Z via five <=14-day windows. 35 packages processed; 31 archived packages have order dates in that interval. No checkout orders, inventory, provider records, secrets or environment files were changed.
- Read-only local API verification against the actual archive returned HTTP 200 for 90 days: 33 marketplace orders, 19817.99 TRY gross, 2 cancelled packages excluded. Four fetched packages predate the requested order-date interval but were modified in it.
- Customer report diagnosis: live RPC returned PGRST202, missing public.admin_customer_growth(p_period). Apply existing 20260921120000_admin_studio_customer_growth.sql; not applied by the agent. It counts site customers, not deduplicated marketplace buyers.
- Local TRENDYOL_SYNC_ENABLED remains 0. This explicit import used a separate operator command, not the disabled automatic sync. Automatic future imports still require enabling that setting and restarting the local server.
- Validation: 2 new calculation tests, 39 synthetic desktop/Android/iOS browser tests, TypeScript, targeted lint and isolated production build pass. Existing generated CSS warnings remain. No commit, push or deployment.

Provider reference: https://developers.trendyol.com/docs/sipari%C5%9F-paketlerini-ak%C4%B1%C5%9F-ile-%C3%A7ekme
