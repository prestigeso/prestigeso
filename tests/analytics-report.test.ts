import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalyticsReport, type Dataset, type SessionRow } from "../lib/analytics/report.ts";
const now = Date.parse("2026-09-17T12:00:00Z");
const session: SessionRow = { id: "session", visitor_id: "visitor", started_at: "2026-09-17T10:00:00Z", last_seen: "2026-09-17T10:20:00Z", entry_page: "home", source: "direct", device: "android", traffic: "normal" };
const filter = { days: 7, device: "all", source: "all", traffic: "normal", audience: "all" };
function fixture(): Dataset {
  const types = ["product_view", "add_cart", "begin_checkout"] as const;
  return { sessions: [session], events: types.map((type, i) => ({ sequence: i + 1, session_id: session.id, visitor_id: session.visitor_id, received_at: `2026-09-17T10:0${i}:00Z`, payload: { version: 1, eventId: `event${i}`, visitorId: session.visitor_id, sessionId: session.id, sequence: i + 1, type, page: "product", productId: 1, quantity: 1, cartId: "cart", attemptId: "attempt" } })),
    orders: [{ id: 1, payment_status: "paid", total_amount: 1000, refunded_amount: 0, created_at: session.started_at, paid_at: "2026-09-17T10:04:00Z" }],
    links: [{ order_id: 1, visitor_id: session.visitor_id, session_id: session.id, cart_id: "cart", attempt_id: "attempt", created_at: session.started_at }] };
}
test("server-linked paid order completes one funnel and cart, with explicit denominators", () => {
  const r = buildAnalyticsReport(fixture(), filter, now);
  assert.equal(r.current.paid, 1); assert.equal(r.finance.orders, 1);
  assert.deepEqual(r.current.checkoutToPaid, { numerator: 1, denominator: 1, percent: 100 });
  assert.equal(r.carts[0].state, "paid"); assert.equal(r.visitors[0].averageSecondsToAdd, 60);
});
test("unlinked financial orders are never divided by measured sessions", () => {
  const d = fixture(); d.links = [];
  const r = buildAnalyticsReport(d, filter, now);
  assert.equal(r.finance.orders, 1); assert.equal(r.finance.unmeasuredOrders, 1); assert.equal(r.current.paid, 0);
});
test("paid status without verified paid timestamp is not a measured sale", () => {
  const d = fixture(); d.orders[0].paid_at = null;
  assert.equal(buildAnalyticsReport(d, filter, now).current.paid, 0);
});
test("paid order without prior cart steps is linked but not invented as full funnel", () => {
  const d = fixture(); d.events = d.events.slice(0, 1);
  const r = buildAnalyticsReport(d, filter, now);
  assert.equal(r.current.paid, 0); assert.equal(r.current.linkedPaidSessions, 1);
});
test("pending provider result is never classified as abandoned even after 24 hours", () => {
  const d = fixture(); d.orders[0].payment_status = "pending"; d.orders[0].paid_at = null;
  assert.equal(buildAnalyticsReport(d, filter, now + 2 * 86400000).carts[0].state, "payment_pending");
  d.links = [];
  assert.equal(buildAnalyticsReport(d, filter, now + 2 * 86400000).carts[0].state, "abandoned");
});
test("staff filtering changes behavior only, not financial truth", () => {
  const d = fixture(); d.sessions[0] = { ...session, traffic: "staff" };
  const r = buildAnalyticsReport(d, filter, now);
  assert.equal(r.current.sessions, 0); assert.equal(r.finance.orders, 1); assert.equal(r.quality.staff, 1);
});
test("different entry source is not attributed to home; unavailable denominators stay null", () => {
  const d = fixture(); d.sessions[0] = { ...session, entry_page: "product" };
  const r = buildAnalyticsReport(d, filter, now);
  assert.equal(r.home.sessions, 0); assert.equal(r.home.viewToCart.percent, null);
  assert.equal(buildAnalyticsReport(d, { ...filter, days: 30 }, now).quality.previousPeriodComplete, false);
});
test("heartbeat cannot overwrite the last confirmed checkout step", () => {
  const d = fixture();
  d.events.push({ ...d.events[0], sequence: 4, payload: { ...d.events[0].payload, type: "checkout_step", step: "address" } });
  d.events.push({ ...d.events[0], sequence: 5, payload: { ...d.events[0].payload, type: "active_time", seconds: 15 } });
  assert.equal(buildAnalyticsReport(d, filter, now).journeys[0].lastStep, "address");
});

test("A B A discovery, add/remove A, add B, checkout and success reload preserve one sale", () => {
  const d = fixture();
  const template = d.events[0];
  const steps = [
    { type: "product_view", productId: 1 },
    { type: "product_view", productId: 2 },
    { type: "product_view", productId: 1 },
    { type: "add_cart", productId: 1, cartId: "cart", quantity: 1 },
    { type: "remove_cart", productId: 1, cartId: "cart", quantity: 1 },
    { type: "add_cart", productId: 2, cartId: "cart", quantity: 1 },
    { type: "begin_checkout", cartId: "cart", attemptId: "attempt" },
    { type: "page_view" },
    { type: "page_view" },
  ] as const;
  d.events = steps.map((fields, index) => ({ ...template, sequence: index + 1,
    payload: { version: 1, eventId: `acceptance-${index}`, visitorId: session.visitor_id,
      sessionId: session.id, sequence: index + 1, page: "product", ...fields } }));
  const r = buildAnalyticsReport(d, filter, now);
  assert.equal(r.discovery.productViews, 3);
  assert.equal(r.discovery.repeatViews, 1);
  assert.deepEqual(r.journeys[0].firstProducts, [1, 2]);
  assert.equal(r.journeys[0].distinctProducts, 2);
  assert.equal(r.products.reduce((sum, p) => sum + p.adds, 0), 2);
  assert.equal(r.carts.length, 1);
  assert.equal(r.carts[0].distinctLines, 1);
  assert.equal(r.carts[0].state, "paid");
  assert.equal(r.current.paid, 1);
  assert.equal(r.finance.orders, 1);
});
