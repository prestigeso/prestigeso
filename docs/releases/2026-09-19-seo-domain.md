# SEO primary-domain consistency

Local changes only; no push, deployment or Vercel settings change performed.

- SEO metadataBase, Open Graph, sitemap, robots sitemap/host and product JSON-LD share `getSeoSiteOrigin`.
- Known production host variants normalize to https://www.prestigeso.com.tr even if the environment still names the apex. Local and preview origins remain usable.
- App-level apex redirect is permanent (308), preserves path/query via Next redirects, and matches only the production apex host.
- Keep /profile private. Do not redirect the invalid /& and /$ paths to the homepage. No literal links to these two invalid paths were found in app/components/lib/public.
- Favicon URL exclusions do not require forcing those assets into the page index.

## Deployment follow-up (requires user approval)

1. Set Production NEXT_PUBLIC_SITE_URL to https://www.prestigeso.com.tr.
2. In Vercel Domains, keep www as primary and change the apex-domain redirect to permanent 308. A platform-level 307 may execute before the app redirect; code alone cannot override it.
3. Deploy approved changes; verify apex redirects to www and www returns 200 with a self-referencing canonical. Check product/category canonicals, JSON-LD, robots.txt and sitemap.xml all use www.
4. In Search Console URL Inspection, test the www homepage and request indexing after deployment. The current Google-selected canonical and report refresh are not verified by local tests.

## Local validation

- TypeScript and targeted ESLint passed.
- 262 Node tests passed, including four new origin/redirect regression tests.
- No production build or browser E2E rerun for this change; no live payment/provider calls.
