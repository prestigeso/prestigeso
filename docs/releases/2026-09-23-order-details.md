# Order details

- Every order row now opens its details; the order-number button remains keyboard accessible.
- Store orders retain the existing customer, shipping, invoice and return workflow.
- Trendyol details open in a native modal dialog instead of below the table. Includes order/package IDs, shipping carrier/tracking link and codes, delivery and billing addresses, products/SKU/barcode/quantities/prices, provider totals/discount, invoice link and status history when supplied.
- Missing optional values are explicitly unknown; identifiers retain leading zeroes. Links accept HTTPS without embedded credentials, with no opener or referrer.
- Admin authorization and no-store responses remain unchanged. No cancellation or provider write was added. Identity numbers and raw payloads are not exposed. The persisted stream mirror explicitly retains its old minimal projection; operational address details are transient.
- Source: https://developers.trendyol.com/v2.0/docs/get-order-packages-getshipmentpackages (v2 response fields, checked 2026-09-23).

Validation: typecheck and targeted lint passed; 12 adapter/preparation unit tests passed. Browser tests: existing/extended 24 tests plus 3 store-detail tests passed on desktop Chromium, Android Chromium and iOS WebKit with synthetic data. Desktop and iOS detail screenshots inspected. Isolated build passed before the stream projection restriction; that final restriction was subsequently typechecked and unit-tested. Nested test checkout retains existing workspace/CSS warnings.

No live order/API validation, database migration, commit, push or deployment. Refresh the local page and manually reload Trendyol packages to obtain the newly projected fields.
