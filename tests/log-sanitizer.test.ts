import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeLogContext, safeLogEventName } from '../lib/logSanitizer.ts';

test('free-form errors, provider messages, secrets and personal fields never reach structured logs', () => {
  const secret = 's3cr3t-value-example';
  const context = { error: new Error(`Rejected buyer@example.test Bearer ${secret}`),
    nested: { message: `full address: 14 Example Road ${secret}`, token: secret, email: 'buyer@example.test',
      unknown: `url=https://example.test?key=${secret}`, customerName: 'Private Person', phone: '05551234567', postalAddress: 'Private Address' },
    Authorization: secret, cookies: secret, password: secret, cardNumber: 4111111111111111,
    ['buyer@example.test']: 'arbitrary', [secret]: true };
  const serialized = JSON.stringify(sanitizeLogContext(context));
  for (const privateValue of [secret,'buyer@example.test','Private Person','05551234567','Private Address','4111111111111111','Example Road'])
    assert.equal(serialized.includes(privateValue), false);
});
test('safe diagnostics remain useful, arbitrary route segments/query strings do not leak', () => {
  assert.deepEqual(sanitizeLogContext({ orderId: 10, status: 'paid', method: 'POST', environment: 'production',
    path: '/api/orders/buyer@example.test?token=secret', digest: '123456', list: ['secret', 'failed'] }),
  { orderId: 10, status: 'paid', method: 'POST', environment: 'production', path: '/api/orders/[segment]', digest: '123456', list: ['[redacted]', 'failed'] });
});
test('deep/circular payloads are bounded; event names cannot inject log lines', () => {
  const circular: Record<string, unknown> = {}; circular.self = circular;
  assert.doesNotThrow(() => JSON.stringify(sanitizeLogContext(circular)));
  assert.equal(safeLogEventName('refund.failed'), 'refund.failed');
  assert.equal(safeLogEventName('event\nBearer secret'), 'invalid_event_name');
});
