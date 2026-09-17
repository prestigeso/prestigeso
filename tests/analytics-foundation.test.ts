import test from "node:test";
import assert from "node:assert/strict";
import { parseBrowserEvents } from "../lib/analytics/contract.ts";
import type { BrowserEvent } from "../lib/analytics/contract.ts";
import { summarizeSession } from "../lib/analytics/discovery.ts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const event = (sequence: number, type: BrowserEvent["type"], fields = {}): BrowserEvent => ({
  version: 1, eventId: id(sequence), visitorId: id(100), sessionId: id(200), sequence, type, page: "product", ...fields,
});

test("analytics accepts closed product shape, rejects PII and forged paid events", () => {
  const view = event(1, "product_view", { productId: 3 });
  assert.deepEqual(parseBrowserEvents([view]), [view]);
  for (const field of ["email", "phone", "address", "url", "token", "revenue", "properties"]) {
    assert.equal(parseBrowserEvents([{ ...view, [field]: "private" }]), null);
  }
  for (const type of ["paid", "purchase", "toString", "__proto__"]) assert.equal(parseBrowserEvents([{ ...view, type }]), null);
});
test("analytics rejects missing IDs, fractions, oversized batches and quantities", () => {
  assert.equal(parseBrowserEvents([]), null);
  assert.equal(parseBrowserEvents(Array(21).fill(event(1, "page_view"))), null);
  for (const productId of [0, -1, 0.5, "3", null]) assert.equal(parseBrowserEvents([event(1, "product_view", { productId })]), null);
  assert.equal(parseBrowserEvents([event(1, "product_view")]), null);
  assert.equal(parseBrowserEvents([event(1, "page_view", { visitorId: "person@example.com" })]), null);
  assert.equal(parseBrowserEvents([event(1, "add_cart", { productId: 1, cartId: id(5), quantity: 1000 })]), null);
});
test("A B A add A remove A add B checkout preserves discovery and deduplicates retries", () => {
  const events = [event(1, "product_view", { productId: 1 }), event(2, "product_view", { productId: 2 }),
    event(3, "product_view", { productId: 1 }), event(4, "add_cart", { productId: 1, cartId: id(9), quantity: 1 }),
    event(5, "remove_cart", { productId: 1, cartId: id(9), quantity: 1 }),
    event(6, "add_cart", { productId: 2, cartId: id(9), quantity: 1 }),
    event(7, "begin_checkout", { cartId: id(9), attemptId: id(8) })];
  const parsed = parseBrowserEvents(events)!;
  assert.ok(parsed);
  const summary = summarizeSession([...parsed].reverse().concat(parsed));
  assert.equal(summary.eventCount, 7);
  assert.equal(summary.productViews, 3);
  assert.equal(summary.distinctProducts, 2);
  assert.equal(summary.repeatProductViews, 1);
  assert.deepEqual(summary.firstFiveViewedProducts, [1, 2]);
  assert.deepEqual(summary.firstFiveClickedProducts, []);
  assert.deepEqual(summary.productToCart, { numerator: 2, denominator: 2, percent: 100 });
  assert.equal(summary.beganCheckout, true);
});
test("empty denominators are unavailable, not zero conversion", () => {
  assert.equal(summarizeSession([]).productToCart.percent, null);
});
test("adding before viewing does not claim a view-to-cart conversion", () => {
  const summary = summarizeSession([event(1, "add_cart", { productId: 4 }), event(2, "product_view", { productId: 4 })]);
  assert.equal(summary.productToCart.percent, 0);
});
test("eight distinct products and two added products is 25 percent regardless of quantity", () => {
  const views = Array.from({ length: 8 }, (_, i) => event(i + 1, "product_view", { productId: i + 1 }));
  const summary = summarizeSession([...views, event(9, "add_cart", { productId: 1, quantity: 5 }), event(10, "add_cart", { productId: 2, quantity: 1 })]);
  assert.equal(summary.productToCart.percent, 25);
  assert.deepEqual(summary.firstFiveViewedProducts, [1, 2, 3, 4, 5]);
});
test("ambiguous ordering, event conflicts and mixed sessions fail explicitly", () => {
  const first = event(1, "page_view");
  assert.throws(() => summarizeSession([first, { ...first, page: "shop" }]), /CONFLICTING_EVENT_ID/);
  assert.throws(() => summarizeSession([first, { ...event(2, "page_view"), sequence: 1 }]), /AMBIGUOUS_SEQUENCE/);
  assert.throws(() => summarizeSession([first, { ...event(2, "page_view"), sessionId: id(300) }]), /MIXED_SESSIONS/);
});
test("checkout steps are closed enums and variant identifiers cannot contain personal text", () => {
  const step = event(1, "checkout_step", { cartId: id(3), attemptId: id(4), step: "otp" });
  assert.ok(parseBrowserEvents([step]));
  assert.equal(parseBrowserEvents([{ ...step, step: "user@example.invalid" }]), null);
  assert.equal(parseBrowserEvents([event(1, "product_view", { productId: 1, variantId: "private" })]), null);
});
