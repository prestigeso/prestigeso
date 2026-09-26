import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(responses: Array<{ status: number; body: object }>, last = 0, hidden = false) {
  const timers = new Map<number, () => Promise<void>>();
  let nextId = 0, requests = 0, cleanup = () => {}, stored = last;
  const paths: string[] = [];
  const code = ts.transpileModule(readFileSync('components/admin/hooks/useTrendyolEntrySync.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, () => unknown> = {};
  const context = vm.createContext({ exports, require: () => ({
    useState: (initial: unknown) => [initial, () => {}],
    useCallback: (fn: unknown) => fn,
    useEffect: (fn: () => () => void) => { cleanup = fn(); },
  }), AbortController, AbortSignal, Date, Error, navigator: { onLine: true }, document: { visibilityState: hidden ? 'hidden' : 'visible' },
    sessionStorage: { getItem: () => String(stored), setItem: (_: string, value: string) => { stored = Number(value); } },
    setTimeout: (fn: () => Promise<void>) => { timers.set(++nextId, fn); return nextId; }, clearTimeout: (id: number) => timers.delete(id),
    fetch: async (path: string) => { paths.push(path); const r = responses[requests++]; if (!r) throw Error('Unexpected extra request'); return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body }; },
  });
  vm.runInContext(code, context);
  exports.useTrendyolEntrySync();
  return { get requests() { return requests; }, get paths() { return paths; }, get stored() { return stored; }, cleanup: () => cleanup(), get pending() { return timers.size; }, async drain() {
    for (let i = 0; timers.size && i < 100; i++) { const [id, fn] = timers.entries().next().value!; timers.delete(id); await fn(); }
  } };
}
test('entry completes all pages then stops permanently', async () => {
  const h = harness([{ status: 200, body: { complete: false } }, { status: 200, body: { complete: true } }, { status: 200, body: { complete: false } }, { status: 200, body: { complete: true } }]);
  await h.drain(); assert.equal(h.requests, 4); assert.equal(h.pending, 0); assert.ok(h.stored > 0);
  assert.deepEqual(h.paths,['/api/admin/trendyol/sync','/api/admin/trendyol/sync','/api/admin/trendyol/finance-sync','/api/admin/trendyol/finance-sync']);
});
test('finance failure keeps entry retryable without repeating financial mutation', async () => {
  const h = harness([{ status:200,body:{complete:true} },...Array.from({length:3},()=>({status:503,body:{error:'Finans arşivi yok.'}}))]);
  await h.drain();assert.equal(h.requests,4);assert.equal(h.stored,0);assert.equal(h.pending,0);
});
test('recent entry, hidden page and unmount make no requests', async () => {
  for (const h of [harness([], Date.now()), harness([], 0, true)]) { await h.drain(); assert.equal(h.requests, 0); }
  const h = harness([]); h.cleanup(); await h.drain(); assert.equal(h.requests, 0);
});
test('transient failures retry at most twice, disabled and unauthorized never retry', async () => {
  const h = harness(Array.from({ length: 3 }, () => ({ status: 503, body: {} })));
  await h.drain(); assert.equal(h.requests, 3); assert.equal(h.stored, 0);
  for (const r of [{ status: 401, body: {} }, { status: 503, body: { disabled: true } }]) {
    const h = harness([r]); await h.drain(); assert.equal(h.requests, 1);
  }
});
test('backlog is bounded to 20 pages and never marked current', async () => {
  const h = harness(Array.from({ length: 20 }, () => ({ status: 200, body: { complete: false } })));
  await h.drain(); assert.equal(h.requests, 20); assert.equal(h.pending, 0); assert.equal(h.stored, 0);
});
