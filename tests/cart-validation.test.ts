import test from "node:test";
import assert from "node:assert/strict";
import { reconcileCart } from "../lib/commerce/cartValidation.ts";

const cart = [
  { id: 9, name: "Kolye", price: 1000, quantity: 2, stock: 10, variant_id: 22 },
];
const data = {
  products: [{ id: 9, price: 1000, discount_price: 800, stock: 10 }],
  variants: [{ id: 22, product_id: 9, price: null, stock: 3, is_active: true }],
  campaigns: [],
  failed: false,
};
test("a transient variant read failure preserves the exact cart instead of deleting it", () => {
  const result = reconcileCart(cart, { ...data, variants: [], failed: true });
  assert.equal(result.cart, cart);
  assert.equal(result.valid, false);
  assert.match(result.message!, /korundu/);
  // A persistence/reload cycle must still have the original selection.
  assert.deepEqual(JSON.parse(JSON.stringify(result.cart)), cart);
});
test("missing product, campaign or variant response fails closed", () => {
  for (const field of ["products", "variants", "campaigns"] as const) {
    const result = reconcileCart(cart, { ...data, [field]: null });
    assert.equal(result.cart, cart);
    assert.equal(result.valid, false);
  }
});
test("retry after temporary failure updates verified price and stock without losing quantity", () => {
  const result = reconcileCart(cart, data);
  assert.equal(result.valid, true);
  assert.equal(result.cart[0].price, 800);
  assert.equal(result.cart[0].stock, 3);
  assert.equal(result.cart[0].quantity, 2);
  assert.equal(cart[0].price, 1000);
});
test("real variant deletion/inactivation is explicit and does not silently discard a line", () => {
  for (const variants of [[], [{ ...data.variants[0], is_active: false }]]) {
    const result = reconcileCart(cart, { ...data, variants });
    assert.equal(result.valid, false);
    assert.equal(result.cart.length, 1);
    assert.match(result.message!, /yeniden seçin/);
  }
});
test("a variant from another product cannot validate a manipulated cart", () => {
  assert.equal(
    reconcileCart(cart, {
      ...data,
      variants: [{ ...data.variants[0], product_id: 99 }],
    }).valid,
    false,
  );
});
test("a legacy variant-less line is blocked when a product now requires an option", () => {
  assert.equal(
    reconcileCart([{ id: 9, name: "Kolye", price: 1000, quantity: 1 }], data)
      .valid,
    false,
  );
});
test("insufficient and zero stock block purchase with an actionable amount message", () => {
  for (const stock of [1, 0]) {
    const result = reconcileCart(cart, {
      ...data,
      variants: [{ ...data.variants[0], stock }],
    });
    assert.equal(result.valid, false);
    assert.equal(result.cart[0].quantity, 2);
    assert.equal(result.cart[0].stock, stock);
    assert.match(result.message!, /Miktarı azaltın/);
  }
});
