# Admin soft-white implementation

Implemented the approved soft-white direction without changing storefront UI or provider authorization.

- Admin-only Inter typography; responsive navigation that wraps labels.
- Overview metric selection and responsive SVG trend chart with exact accessible day selection, missing-day gaps and optional prior-period comparison.
- Customers: balanced two-card summary, acquisition chart and communication section.
- Performance: removed duplicated embedded heading, grouped filters and softer summary/report surfaces.
- Marketing, finance and settings: descriptive section navigation; consistent rounded form/report panels and input styling. Existing drafts remain mounted across navigation.
- Design rules: `docs/design/admin-soft-ui.md`.

Validation: TypeScript and targeted ESLint passed. Isolated production build generated 82 routes. The nested test checkout emits workspace-root and two generated CSS warnings; these are not treated as clean-build evidence. Local TLS certificate was renewed after expiry caused the initial sitemap fixture fetch failure.

Playwright admin suite: 21 passed across desktop Chromium, Android Chromium and iOS WebKit. Coverage includes channel filtering, provider failure isolation, chart exact/zero values, page overflow, cost draft persistence, optimistic product edits and shipping null versus zero. Screenshots inspected for overview, customers, performance, marketing, finance and settings. Reports use synthetic/empty fixtures; live populated provider reports are not verified by these tests.

No commit, push or deployment performed.
