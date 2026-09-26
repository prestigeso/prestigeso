import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFinanceRecord } from '../lib/finance/records.ts';
import { orderContribution } from '../lib/finance/orderContribution.ts';
import { breakeven } from '../lib/finance/breakeven.ts';
const base = { requestId: '12345678-1234-4123-8123-123456789012', expectedVersion: 0, kind: 'product_cost', key: 'Q316', amount: '12,34', taxBasis: 'inclusive', note: 'Purchase receipt' };
test('persistent costs preserve unknown, zero and tax basis', () => {
  assert.equal(validateFinanceRecord(base).payload.amountMinor, 1234);
  assert.equal(validateFinanceRecord({ ...base, amount: '' }).payload.amountMinor, null);
  assert.equal(validateFinanceRecord({ ...base, amount: '0' }).payload.amountMinor, 0);
  assert.equal(validateFinanceRecord({ ...base, taxBasis: 'exclusive' }).payload.taxBasis, 'exclusive');
});
test('records reject overposting, unsafe numbers, malformed IDs and missing explanation', () => {
  for (const patch of [{ admin: true }, { amount: '-1' }, { amount: '1e9' }, { expectedVersion: -1 }, { taxBasis: 'unknown' }, { requestId: 'bad' }, { note: '' }, { amount: '0.001' }]) assert.throws(() => validateFinanceRecord({ ...base, ...patch }));
  assert.throws(() => validateFinanceRecord({ ...base, kind: 'order_cost', key: '1:revenue' }));
  assert.throws(() => validateFinanceRecord({ ...base, kind: 'advertising', key: '2026-02-31:test' }));
});
test('SKU mapping records contain no financial value or stock instruction', () => {
  assert.deepEqual(validateFinanceRecord({ ...base, kind: 'sku_mapping', amount: 'SITE-1' }).payload, { siteSku: 'SITE-1', note: base.note });
});
const order = { id: 1, total_amount: '100.00', refunded_amount: '0.00', payment_status: 'paid', paid_at: '2026-09-19T00:00:00Z' };
test('order contribution uses historical cost and explicit corrections, missing stays unknown', () => {
  const lines = [{ quantity: 2, unitCost: { amountMinor: 1000, taxBasis: 'inclusive' } }];
  const costs = ['paymentFees', 'packaging', 'shipping', 'returnCosts'].map(f => ({ resource_key: `1:${f}`, payload: { amountMinor: 0, taxBasis: 'inclusive' } }));
  assert.equal(orderContribution(order, lines, costs).result?.beforeAdvertising, 8000);
  assert.equal(orderContribution(order, null, costs).result?.beforeAdvertising, null);
  assert.equal(orderContribution({ ...order, refunded_amount: '10.00' }, lines, costs).input.goods, null);
  assert.equal(orderContribution(order, lines, [...costs, { resource_key: '1:goods', payload: { amountMinor: 500, taxBasis: 'exclusive' } }]).input.goods, null);
  assert.equal(orderContribution({ ...order, paid_at: null }, lines, costs).eligible, false);
});
test('breakeven rounds up exact cents and never assumes platform rates', () => {
  assert.equal(breakeven(10000, 2000, 0), 12500);
  assert.equal(breakeven(10000, 2000, 3000), 20000);
  assert.equal(breakeven(1, 3000, 0), 2);
  for (const args of [[-1,0,0], [100,10000,0], [100,5000,5000], [100,0.1,0]]) assert.throws(() => breakeven(...args as [number, number, number]));
});
