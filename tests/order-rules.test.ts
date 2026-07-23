import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateCartLines,
  aggregateCartQuantities,
  calculateDiscount,
  calculateShipping,
  roundMoney,
} from "../lib/commerce/orderRules.ts";
import { getEffectiveUnitPrice } from "../lib/commerce/pricing.ts";

test("different variants remain separate cart lines", () => {
  assert.deepEqual(
    aggregateCartLines([
      { id: 1, variant_id: 10, quantity: 2 },
      { id: 1, variant_id: 11, quantity: 3 },
      { id: 1, variant_id: 10, quantity: 1 },
    ]),
    [
      { productId: 1, variantId: 10, quantity: 3 },
      { productId: 1, variantId: 11, quantity: 3 },
    ],
  );
});

test("duplicate cart lines are aggregated", () => {
  assert.deepEqual(
    [
      ...aggregateCartQuantities([
        { id: 7, quantity: 2 },
        { id: "7", quantity: 3 },
      ]),
    ],
    [[7, 5]],
  );
});

test("fractional and excessive quantities are rejected", () => {
  assert.throws(
    () => aggregateCartQuantities([{ id: 1, quantity: 0.5 }]),
    /INVALID_QUANTITY/,
  );
  assert.throws(
    () =>
      aggregateCartQuantities([
        { id: 1, quantity: 60 },
        { id: 1, quantity: 40 },
      ]),
    /MAX_QUANTITY_EXCEEDED/,
  );
});

test("discount never exceeds subtotal or configured cap", () => {
  assert.equal(
    calculateDiscount({
      subtotal: 100,
      type: "percent",
      value: 50,
      maxDiscount: 20,
    }),
    20,
  );
  assert.equal(
    calculateDiscount({ subtotal: 30, type: "fixed", value: 100 }),
    30,
  );
});

test("shipping threshold and monetary rounding are deterministic", () => {
  assert.equal(
    calculateShipping({
      enabled: true,
      fee: 49.9,
      threshold: 500,
      subtotal: 500,
    }),
    0,
  );
  assert.equal(
    calculateShipping({
      enabled: true,
      fee: 49.9,
      threshold: 500,
      subtotal: 499,
    }),
    49.9,
  );
  assert.equal(roundMoney(10.005), 10.01);
});

test("fixed and campaign discounts use the lowest price without stacking", () => {
  assert.equal(
    getEffectiveUnitPrice({
      basePrice: 100,
      discountPrice: 80,
      campaignPercent: 10,
    }),
    80,
  );
  assert.equal(
    getEffectiveUnitPrice({
      basePrice: 100,
      discountPrice: 95,
      campaignPercent: 20,
    }),
    80,
  );
  assert.equal(
    getEffectiveUnitPrice({ basePrice: 100, discountPrice: 120 }),
    100,
  );
});
