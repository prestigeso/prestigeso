import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { validatePaytrNotification } from '../lib/paytr/notification.ts';
import { createPaytrCallbackHash } from '../lib/paytr/signatures.ts';
import { comparePaytrStatus } from '../lib/paytr/statusComparison.ts';
import { runEmailDelivery, type ClaimedEmail, type EmailDeliveryResult, type OutboxDependencies } from '../lib/email/outboxWorkflow.ts';

const secrets = { merchantKey: 'test-only-key', merchantSalt: 'test-only-salt' };
function callback(status: 'success' | 'failed' = 'success') {
  const form = new URLSearchParams({ merchant_oid: 'PRS12345', status, total_amount: '1000' });
  form.set('hash', createPaytrCallbackHash({ merchantOid: 'PRS12345', status, totalAmount: '1000', ...secrets }));
  return form;
}
for (const status of ['success', 'failed'] as const) test(`valid signed ${status} callback`, () => {
  assert.equal(validatePaytrNotification(callback(status), secrets).ok, true);
});
for (const [field, value] of [['merchant_oid', "1' OR 1=1"], ['status', 'paid'], ['total_amount', '-1'],
  ['total_amount', '1.5'], ['total_amount', '1e3'], ['total_amount', '0001000'], ['total_amount', '999999999999999999'],
  ['hash', 'forged'], ['merchant_oid', 'PRSOTHER']] as const) {
  test(`tampered callback rejected: ${field}=${value}`, () => {
    const form = callback(); form.set(field, value); assert.equal(validatePaytrNotification(form, secrets).ok, false);
  });
}
test('duplicate callback fields are rejected, not first-value-wins', () => {
  const form = callback(); form.append('total_amount', '1'); assert.equal(validatePaytrNotification(form, secrets).ok, false);
});
test('status query only authorizes recovery with correct TL amount and zero refunds', () => {
  const remote = { status: 'success', payment_amount: '10,00', payment_total: '10.00', currency: 'TL', returns: [] };
  assert.equal(comparePaytrStatus(10, 0, remote).canRecoverPayment, true);
  for (const patch of [{ currency: 'USD' }, { payment_amount: '9.99' }, { status: 'failed' },
    { payment_total: 9 }, { returns: [{ return_amount: '1' }] }, { returns: [null] }, { returns: [{ return_amount: 'NaN' }] }])
    assert.equal(comparePaytrStatus(10, 0, { ...remote, ...patch }).canRecoverPayment, false);
});
test('invalid remote refund data cannot masquerade as reconciled zero', () => {
  assert.equal(comparePaytrStatus(10, 0, { status: 'success', payment_amount: 10, payment_total: 10, currency: 'TRY', returns: [{}] }).status, 'mismatch');
});

function fixture(provider?: typeof fetch) {
  const now = Date.parse('2026-09-06T12:00:00Z');
  let claimed = false;
  const row: ClaimedEmail = { id: 'test-outbox-id', lease_token: 'lease-1', attempts: 1,
    first_attempt_at: new Date(now).toISOString(), payload: { from: 'Shop <shop@example.test>', to: ['buyer@example.test'],
      subject: 'Order', html: '<p>Confirmed</p>' } };
  const calls = { provider: 0, finishes: [] as EmailDeliveryResult[], keys: [] as string[], payloads: [] as string[] };
  const deps: OutboxDependencies = { apiKey: 'fake-key', now: () => now,
    claim: async () => { if (claimed) return null; claimed = true; return row; },
    finish: async (_row, result) => { calls.finishes.push(result); return true; },
    fetch: async (input, init) => { calls.provider++; calls.keys.push(new Headers(init?.headers).get('Idempotency-Key') || '');
      calls.payloads.push(String(init?.body)); return provider ? provider(input, init) : Response.json({ id: 'provider-id' }); } };
  return { deps, calls, row, reclaim: () => { claimed = false; } };
}
test('concurrent delivery workers send once using durable idempotency key', async () => {
  const f = fixture(); const results = await Promise.all([runEmailDelivery(f.row.id, f.deps), runEmailDelivery(f.row.id, f.deps)]);
  assert.equal(f.calls.provider, 1); assert.equal(results.filter(result => result.status === 'sent').length, 1);
  assert.equal(f.calls.keys[0], 'prestigeso-outbox/test-outbox-id');
});
test('configuration failure leaves queue unclaimed and never sends', async () => {
  const f = fixture(); f.deps.apiKey = undefined;
  assert.equal((await runEmailDelivery(f.row.id, f.deps)).status, 'not_configured'); assert.equal(f.calls.provider, 0);
});
for (const [name, provider] of [
  ['timeout', async () => { throw new Error('network'); }],
  ['500', async () => new Response('', { status: 500 })],
  ['invalid JSON', async () => new Response('malformed')],
  ['missing id', async () => Response.json({})],
  ['409 in-progress', async () => new Response('', { status: 409 })],
] as [string, typeof fetch][]) test(`ambiguous provider ${name} retained as unknown, retry uses identical key and payload`, async () => {
  const f = fixture(provider);
  assert.equal((await runEmailDelivery(f.row.id, f.deps)).status, 'unknown');
  assert.equal(f.calls.finishes[0].retry, true);
  f.reclaim(); await runEmailDelivery(f.row.id, f.deps);
  assert.equal(f.calls.keys[0], f.calls.keys[1]); assert.equal(f.calls.payloads[0], f.calls.payloads[1]);
});
test('known provider rejection is failed; not blindly retried', async () => {
  const f = fixture(async () => new Response('', { status: 422 })); await runEmailDelivery(f.row.id, f.deps);
  assert.deepEqual(f.calls.finishes[0], { status: 'failed', errorCode: 'provider_http_422', retry: false });
});
test('provider rate limit keeps safe bounded retry', async () => {
  const f = fixture(async () => new Response('', { status: 429 })); await runEmailDelivery(f.row.id, f.deps);
  assert.equal(f.calls.finishes[0].retry, true);
});
for (const hours of [23, 24, 100]) test(`unknown message aged ${hours}h never leaves server`, async () => {
  const f = fixture(); f.row.first_attempt_at = new Date(f.deps.now() - hours * 3600000).toISOString();
  await runEmailDelivery(f.row.id, f.deps); assert.equal(f.calls.provider, 0);
  assert.equal(f.calls.finishes[0].retry, false);
});
test('lost database acknowledgement never starts a second provider request', async () => {
  const f = fixture(); f.deps.finish = async () => false;
  await assert.rejects(runEmailDelivery(f.row.id, f.deps), /EMAIL_RESULT_NOT_RECORDED/); assert.equal(f.calls.provider, 1);
});
test('callback acknowledges durable financial result before noncritical delivery', async () => {
  const source = await readFile(new URL('../app/api/paytr/callback/route.ts', import.meta.url), 'utf8');
  assert.match(source, /record_verified_paytr_result/); assert.match(source, /after\(async/);
  assert.doesNotMatch(source, /reserveOrderStock|releaseOrderStock|finishPostPaymentProcessing/);
});
test('operations API excludes recipients and private payloads', async () => {
  const source = await readFile(new URL('../app/api/admin/operations/route.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\.select\([^)]*(recipient|payload)/);
  assert.match(source, /isAdminRequest/); assert.match(source, /dispatchTransactionEmail/);
});
