import test from 'node:test';
import assert from 'node:assert/strict';
import type { SupabaseClient } from '@supabase/supabase-js';
import { syncAutomaticPage } from '../lib/trendyol/auto-sync.ts';

const env = { TRENDYOL_SYNC_ENABLED: '1', TRENDYOL_SELLER_ID: '123', TRENDYOL_ENVIRONMENT: 'stage', TRENDYOL_API_KEY: 'synthetic', TRENDYOL_API_SECRET: 'synthetic' };
function fixture(options: { fresh?: boolean; fail?: string; more?: boolean; allowed?: boolean; old?: boolean } = {}) {
  const calls: string[] = [];
  const now = Date.now();
  const chain = { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: { id: 'job', revision: 3, starts_at: now - 86400000, ends_at: options.old ? now - 86400000 : now, cursor_value: 'checkpoint', status: 'ready' }, error: null }; } };
  const db = { from() { return chain; }, async rpc(name: string, args: Record<string, unknown>) {
    calls.push(name);
    if (options.fail === name) return { error: Error('private provider details') };
    if (name === 'trendyol_auto_job') return { data: options.fresh ? null : 'job' };
    if (name === 'trendyol_apply_sync_page') assert.equal(args.p_revision, 3);
    return { data: 4 };
  } } as unknown as SupabaseClient;
  return { calls, dependencies: { db, env, now: () => now, budget: async () => ({ allowed: options.allowed !== false }), fetchPage: async () => {
    calls.push('fetch');
    if (options.fail === 'fetch') throw Error('private provider details');
    return { packages: [], buyers: [], hasMore: options.more ?? false, nextCursor: options.more ? 'next' : null };
  } } };
}
test('disabled/configuration and rate limit never call provider', async () => {
  for (const override of [{ TRENDYOL_SYNC_ENABLED: '0' }, { TRENDYOL_API_KEY: '' }]) {
    const f = fixture();
    assert.equal((await syncAutomaticPage({ ...f.dependencies, env: { ...env, ...override } })).status, 503);
    assert.deepEqual(f.calls, []);
  }
  const f = fixture({ allowed: false });
  assert.equal((await syncAutomaticPage(f.dependencies)).status, 429);
  assert.deepEqual(f.calls, []);
});
test('fresh checkpoint avoids provider request', async () => {
  const f = fixture({ fresh: true });
  const r = await syncAutomaticPage(f.dependencies);
  assert.equal(r.body.fresh, true);
  assert.deepEqual(f.calls, ['trendyol_auto_job']);
});
test('page is checkpointed only after buyer save', async () => {
  const f = fixture();
  assert.equal((await syncAutomaticPage(f.dependencies)).body.complete, true);
  assert.deepEqual(f.calls, ['trendyol_auto_job', 'fetch', 'trendyol_record_buyers', 'trendyol_apply_sync_page']);
});
test('history and pagination do not falsely report current', async () => {
  for (const options of [{ old: true }, { more: true }]) {
    const f = fixture(options);
    assert.equal((await syncAutomaticPage(f.dependencies)).body.complete, false);
  }
});
test('provider/buyer/save failures remain retryable without secret leakage', async () => {
  for (const fail of ['fetch', 'trendyol_record_buyers', 'trendyol_apply_sync_page']) {
    const f = fixture({ fail });
    const result = await syncAutomaticPage(f.dependencies);
    assert.equal(result.status, 503);
    assert.ok(!JSON.stringify(result).includes('private provider'));
    if (fail !== 'trendyol_apply_sync_page') assert.ok(!f.calls.includes('trendyol_apply_sync_page'));
  }
});
