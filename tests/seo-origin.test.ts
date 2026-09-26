import test from 'node:test';
import assert from 'node:assert/strict';
import { getSeoSiteOrigin, PRODUCTION_SITE_ORIGIN } from '../lib/seo/siteOrigin.ts';
import nextConfig from '../next.config.ts';

test('SEO normalizes production domain variants to HTTPS www', () => {
  for (const input of ['', 'https://prestigeso.com.tr', 'http://prestigeso.com.tr/', 'https://www.prestigeso.com.tr/', ' https://PRESTIGESO.com.tr/path?x=1 ']) {
    assert.equal(getSeoSiteOrigin(input), PRODUCTION_SITE_ORIGIN);
  }
});

test('SEO keeps local and preview origins without paths or trailing slash', () => {
  assert.equal(getSeoSiteOrigin('http://localhost:3000/'), 'http://localhost:3000');
  assert.equal(getSeoSiteOrigin('https://preview.vercel.app/path'), 'https://preview.vercel.app');
});

test('SEO rejects invalid and credential-bearing origins', () => {
  for (const input of ['not a url', 'ftp://example.com', 'https://user:password@example.com']) {
    assert.throws(() => getSeoSiteOrigin(input));
  }
});

test('apex redirect is permanent and restricted to the exact production host', async () => {
  const rules = await nextConfig.redirects!();
  assert.deepEqual(rules, [{ source: '/:path*', has: [{type: 'host', value: 'prestigeso\\.com\\.tr'}], destination: `${PRODUCTION_SITE_ORIGIN}/:path*`, permanent: true }]);
});
