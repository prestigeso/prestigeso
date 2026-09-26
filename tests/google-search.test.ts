import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchSearchReport, validateSearchQuery, checkSearchConnection } from '../lib/integrations/googleSearch.ts';
import { googleSearchFailure, googleSearchWindow } from '../lib/integrations/googleSearchStatus.ts';
const creds = { clientId: 'test-client', clientSecret: 'test-secret', refreshToken: 'test-refresh' };
const query = { startDate: '2026-08-01', endDate: '2026-08-31', dimension: 'query' as const, startRow: 0 };
test('Google uses fixed endpoints, server OAuth, final PT data and bounded paging', async () => {
  let calls = 0;
  const report = await fetchSearchReport(creds, query, async (url, init) => {
    calls++; assert.equal(init?.redirect, 'error'); assert.equal(init?.cache, 'no-store');
    if (calls === 1) { assert.equal(String(url), 'https://oauth2.googleapis.com/token'); return Response.json({ access_token: 'fixture-access', token_type: 'Bearer' }); }
    assert.equal(String(url), 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aprestigeso.com.tr/searchAnalytics/query');
    const body = JSON.parse(String(init?.body)); assert.equal(body.dataState, 'final'); assert.equal(body.rowLimit, 100); assert.equal(body.startRow, 0);
    return Response.json({ rows: [{ keys: ['kolye'], clicks: 2, impressions: 10, ctr: 0.2, position: 3 }] });
  });
  assert.equal(calls, 2); assert.equal(report.timeZone, 'America/Los_Angeles'); assert.equal(report.topRowsOnly, true); assert.equal(report.rows[0].clicks, 2);
  assert.ok(!JSON.stringify(report).includes('fixture-access'));
});
test('Google rejects invalid dates, dimension, range and offsets before network', () => {
  for (const patch of [{ startDate: '2026-02-30' }, { endDate: '2027-01-01' }, { dimension: 'secret' }, { startRow: -1 }, { startRow: 101 }]) assert.throws(() => validateSearchQuery({ ...query, ...patch } as typeof query));
});
test('Google provider auth failures and timeouts are sanitized, not empty reports', async () => {
  for (const status of [400,401,403,429,500]) await assert.rejects(fetchSearchReport(creds, query, async () => Response.json({ secret: 'never surface' }, { status })), /GOOGLE_/);
  await assert.rejects(fetchSearchReport(creds, query, async () => { throw new Error('private-token'); }), /GOOGLE_UNAVAILABLE/);
});
test('Google rejects corrupt rows, duplicate keys and oversized bodies', async () => {
  for (const body of [{ rows: [{}] }, { rows: [{keys:['x'],clicks:2,impressions:1,ctr:2,position:1}] }, { rows: 'broken' }]) {
    let count = 0; await assert.rejects(fetchSearchReport(creds, query, async () => Response.json(++count === 1 ? { access_token: 'x', token_type: 'Bearer' } : body)), /GOOGLE_SCHEMA/);
  }
  await assert.rejects(fetchSearchReport(creds, query, async () => Response.json({ x: 'x'.repeat(600000) })), /BODY_LIMIT/);
});

test('Google connection checks the exact property and strips unrelated account data', async () => {
  let count = 0;
  const result = await checkSearchConnection(creds, async (url, init) => {
    if (++count === 1) return Response.json({ access_token: 'hidden-token', token_type: 'Bearer' });
    assert.equal(String(url), 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Aprestigeso.com.tr');
    assert.equal(init?.method, 'GET'); assert.equal(init?.redirect, 'error');
    return Response.json({ siteUrl: 'sc-domain:prestigeso.com.tr', permissionLevel: 'siteOwner', secret: 'hidden-extra' });
  });
  assert.equal(result.connected, true); assert.equal(result.permission, 'siteOwner');
  assert.ok(!JSON.stringify(result).includes('hidden-'));
  for (const site of [{ siteUrl: 'sc-domain:another.com', permissionLevel: 'siteOwner' }, { siteUrl: 'sc-domain:prestigeso.com.tr', permissionLevel: 'siteUnverifiedUser' }, null]) {
    let calls = 0;
    await assert.rejects(checkSearchConnection(creds, async () => Response.json(++calls === 1 ? { access_token: 'x', token_type: 'Bearer' } : site)), /GOOGLE_(PERMISSION|SCHEMA)/);
  }
});

test('Google diagnostics separate revoked authorization, permission and quota without leaking data', async () => {
  for (const [status, code] of [[400, 'reauthorize'], [401, 'reauthorize'], [403, 'permission'], [429, 'rate_limit'], [500, 'unavailable']] as const) {
    try { await checkSearchConnection(creds, async () => Response.json({ error: 'private-secret' }, { status })); assert.fail('must reject'); }
    catch (error) { const result = googleSearchFailure(error); assert.equal(result.code, code); assert.ok(!JSON.stringify(result).includes('private-secret')); }
  }
  for (const value of ['private-token', '__proto__', 'constructor']) assert.equal(googleSearchFailure(new Error(value)).code, 'unavailable');
});

test('Google quick ranges use PT calendar dates across DST and preserve inclusive window size', () => {
  for (const now of ['2026-03-09T01:00:00Z', '2026-11-02T01:00:00Z', '2026-01-01T01:00:00Z']) {
    for (const days of [7, 28, 90] as const) { const r = googleSearchWindow(days, new Date(now)); assert.equal((Date.parse(r.end) - Date.parse(r.start)) / 86400000 + 1, days); }
  }
  assert.deepEqual(googleSearchWindow(7, new Date('2026-01-01T01:00:00Z')), { start: '2025-12-22', end: '2025-12-28' });
});
