import type { BrowserEvent } from "./contract.ts";

/** A report window must be selected by the caller. No lifetime-person claims.
 * Requires validated events from ONE session. sequence is monotonic within that session.
 */
export function summarizeSession(events: readonly BrowserEvent[]) {
  const unique = new Map<string, BrowserEvent>();
  for (const event of events) {
    const existing = unique.get(event.eventId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(event)) throw new Error("CONFLICTING_EVENT_ID");
    unique.set(event.eventId, event);
  }
  const ordered = [...unique.values()].sort((a, b) => a.sequence - b.sequence);
  if (new Set(ordered.map((e) => `${e.visitorId}/${e.sessionId}`)).size > 1) throw new Error("MIXED_SESSIONS");
  if (new Set(ordered.map((e) => e.sequence)).size !== ordered.length) throw new Error("AMBIGUOUS_SEQUENCE");
  const views = ordered.filter((e) => e.type === "product_view");
  const products = [...new Set(views.map((e) => e.productId!))];
  const firstClicks = [...new Set(ordered.filter((e) => e.type === "product_click").map((e) => e.productId!))];
  const viewed = new Set<number>();
  const viewedThenAdded = new Set<number>();
  for (const event of ordered) {
    if (event.type === "product_view") viewed.add(event.productId!);
    if (event.type === "add_cart" && viewed.has(event.productId!)) viewedThenAdded.add(event.productId!);
  }
  return {
    eventCount: ordered.length,
    productViews: views.length,
    distinctProducts: products.length,
    repeatProductViews: views.length - products.length,
    distinctCategories: new Set(ordered.filter((e) => e.type === "category_view").map((e) => e.categoryId!)).size,
    firstFiveViewedProducts: products.slice(0, 5),
    firstFiveClickedProducts: firstClicks.slice(0, 5),
    viewedThenAddedProducts: viewedThenAdded.size,
    productToCart: {
      numerator: viewedThenAdded.size,
      denominator: products.length,
      percent: products.length ? viewedThenAdded.size / products.length * 100 : null,
    },
    // Not net cart contents: removing an item does not erase a historical add.
    addedToCart: ordered.some((e) => e.type === "add_cart"),
    beganCheckout: ordered.some((e) => e.type === "begin_checkout"),
  };
}
