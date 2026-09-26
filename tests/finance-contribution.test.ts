import test from "node:test";
import assert from "node:assert/strict";
import { calculateContribution, parseTryAmount, FINANCE_FIELDS, type ContributionInput } from "../lib/finance/contribution.ts";
const complete: ContributionInput = { revenue: 100000, refunds: 10000, goods: 30000, paymentFees: 3000, packaging: 2000, shipping: 5000, returnCosts: 1000, advertising: 10000 };
test("finance decimal input preserves cents and Turkish comma without rounding", () => {
  assert.equal(parseTryAmount("1000,01"), 100001); assert.equal(parseTryAmount("0.10"), 10);
  assert.equal(parseTryAmount("0"), 0); assert.equal(parseTryAmount(" "), null);
  for (const value of ["1.000,00", "1e3", "-1", "1.001", "NaN", "Infinity", "1,000", "1000000000.01"]) assert.throws(() => parseTryAmount(value));
});
test("contribution separates refunds, operating costs and advertising exactly", () => {
  const r = calculateContribution(complete);
  assert.equal(r.netRevenue, 90000); assert.equal(r.operatingCosts, 41000);
  assert.equal(r.beforeAdvertising, 49000); assert.equal(r.afterAdvertising, 39000);
  assert.equal(r.blendedRevenueToSpend, 9); assert.deepEqual(r.missing, []);
});
test("each missing field remains unknown and prevents a complete contribution", () => {
  for (const field of FINANCE_FIELDS) { const r = calculateContribution({ ...complete, [field]: null }); assert.equal(r.afterAdvertising, null); assert.deepEqual(r.missing, [field]); }
  assert.equal(calculateContribution({ ...complete, advertising: null }).beforeAdvertising, 49000);
});
test("zero denominators remain undefined; negative contribution is retained", () => {
  assert.equal(calculateContribution({ ...complete, advertising: 0 }).blendedRevenueToSpend, null);
  assert.equal(calculateContribution({ ...complete, refunds: 100000 }).marginPercent, null);
  assert.equal(calculateContribution({ ...complete, advertising: 90000 }).afterAdvertising, -41000);
});
test("invalid minor units, over-refunds and missing object keys reject", () => {
  for (const revenue of [-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) assert.throws(() => calculateContribution({ ...complete, revenue }));
  assert.throws(() => calculateContribution({ ...complete, refunds: 100001 }));
  assert.throws(() => calculateContribution({} as ContributionInput));
});
