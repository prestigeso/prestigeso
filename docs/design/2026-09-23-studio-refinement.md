# Studio refinement

## Plan

Problem: equally weighted floating cards fragment the overview; repeated explanatory text competes with the data, while empty product panels feel unfinished.

1. Join summary metrics and the daily chart into one continuous, rounded white analysis surface. Keep the first metric visually primary using neutral surface contrast.
2. Preserve a second row for the two relevant decision panels. Tighten bar spacing and give ranked entries a consistent number marker.
3. Use a quiet period eyebrow, consistent numeric hierarchy and small scope badges. Keep calendar methodology accessible in the expandable data-scope section.
4. Replace bare empty text with an explicit empty state; never add sample production values or pretend to have data.
5. Preserve navigation, provider actions, calculations and the existing expandable advanced tools. Keep mobile metrics in two columns without horizontal overflow.

## Delivery and checks

Implemented in StudioInsights.tsx and its scoped CSS module only. Storefront untouched. TypeScript and targeted ESLint passed. Isolated production build passed with existing generated CSS/workspace-root warnings. All 30 synthetic admin browser tests passed on desktop Chromium, Android Chromium and iOS WebKit. Desktop performance and mobile finance screenshots visually reviewed. No live-provider checks, commit, push or deploy.
