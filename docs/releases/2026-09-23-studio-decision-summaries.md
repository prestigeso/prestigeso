# Admin decision summaries — 2026-09-23

Performance, marketing and finance now start with a small decision-focused overview instead of displaying every report and configuration at once. Existing detailed reports and tools remain available through expandable sections. Storefront styling and behavior are unchanged.

- Performance: measured sessions, product-view/cart/purchase funnel, daily visits and top five viewed products.
- Marketing: measured visits, search/social sources, source shares and purchase-linked sessions. Source association is not presented as causal ad attribution or ROAS.
- Finance: verified store sales, recorded refunds, remainder before expenses, paid orders and daily sales/order trend. Trendyol is not included in these financial totals. Missing aggregate costs are not treated as zero or represented as net profit.
- Daily charts use Istanbul calendar dates; first and last dates may cover partial days. Refunds belong to the selected sales cohort, not refund transaction date.

Validation: TypeScript, targeted ESLint, 10 analytics unit tests and isolated production build passed. All 30 admin Playwright tests passed across desktop Chromium, Android Chromium and iOS WebKit using synthetic fixtures. Desktop screenshots for all three screens and mobile performance screenshot visually reviewed; no horizontal overflow in the tested views.

These checks do not validate production data, live provider credentials, attribution completeness or uninterrupted analytics collection. No commit, push or deployment performed.
