# Overview: unified sales and complete zero buckets

- Overview now reads the same combined finance calculation as Finance, rather than the site-only dashboard totals/daily view. Preserves the existing admin visual language.
- Requested periods: 24h, 48h, 7d, 28d, 90d, 365d. Short ranges are hourly, longer ranges daily in Europe/Istanbul. Partial first/last buckets are possible for rolling periods.
- Optional authenticated overview response includes bounded, fully paginated page-view history. Missing rows in a successfully completed query produce zero buckets; errors leave totals unavailable, never zero. Capacity remains 20,000 rows per input, failing closed on incomplete reads.
- Comparison points remain unavailable rather than inventing an unqueried prior period. Recent-order preview remains explicitly site-only; all-channel order details are in Orders.
- Read-only real-data endpoint checks: all six periods HTTP 200; 28d gross 2335.45 TRY / 4 orders / 35 page views, 14 zero-visit buckets. 90d gross 19817.99 TRY / 33 orders. Chart sums match totals.
- 42 synthetic browser tests across desktop, Android and iOS pass; TypeScript, targeted ESLint and isolated build pass. Existing generated CSS warnings remain. No migrations, environment edits, push or deployment.
