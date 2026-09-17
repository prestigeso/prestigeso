import type { BrowserEvent } from "./contract.ts";
export type SessionRow = { id: string; visitor_id: string; started_at: string; last_seen: string; entry_page: string; source: string; device: string; traffic: string };
export type EventRow = { sequence: number; session_id: string; visitor_id: string; received_at: string; payload: BrowserEvent };
export type OrderRow = { id: number; payment_status: string; total_amount: number; refunded_amount: number | null; paid_at: string | null; created_at: string };
export type LinkRow = { order_id: number; visitor_id: string; session_id: string; cart_id: string; attempt_id: string; created_at: string };
export type Dataset = { sessions: SessionRow[]; events: EventRow[]; orders: OrderRow[]; links: LinkRow[] };
export type ReportFilter = { days: number; device: string; source: string; traffic: string; audience: string };
const paid = (o: OrderRow) => ["paid", "partially_refunded", "refunded"].includes(o.payment_status) && o.paid_at !== null;
const percentage = (a: number, b: number) => ({ numerator: a, denominator: b, percent: b ? a / b * 100 : null });
export function buildAnalyticsReport(data: Dataset, filter: ReportFilter, now = Date.now()) {
  const from = now - filter.days * 86400000;
  const orderMap = new Map(data.orders.map((o) => [o.id, o]));
  const visitNumbers = new Map<string, number>(), visitorCounts = new Map<string, number>();
  for (const s of [...data.sessions].sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))) { const n = (visitorCounts.get(s.visitor_id) || 0) + 1; visitorCounts.set(s.visitor_id, n); visitNumbers.set(s.id, n); }
  const linksBySession = new Map<string, LinkRow[]>();
  for (const link of data.links) { const group = linksBySession.get(link.session_id) || []; group.push(link); linksBySession.set(link.session_id, group); }
  const firstSeen = new Map<string, number>();
  for (const s of data.sessions) firstSeen.set(s.visitor_id, Math.min(firstSeen.get(s.visitor_id) ?? Infinity, Date.parse(s.started_at)));
  const select = (start: number, end: number) => data.sessions.filter((s) => {
    const t = Date.parse(s.started_at);
    return t >= start && t < end && (filter.device === "all" || s.device === filter.device) &&
      (filter.source === "all" || s.source === filter.source) && (filter.traffic === "all" || s.traffic === filter.traffic) &&
      (filter.audience === "all" || (filter.audience === "new" ? firstSeen.get(s.visitor_id) === t : firstSeen.get(s.visitor_id)! < t));
  });
  const sessions = select(from, now).sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at)), previousSessions = select(from - filter.days * 86400000, from);
  const summarize = (selected: SessionRow[]) => {
    const ids = new Set(selected.map((s) => s.id));
    const events = data.events.filter((e) => ids.has(e.session_id)).sort((a, b) => a.sequence - b.sequence);
    const saw = new Set<string>(), added = new Set<string>(), checkout = new Set<string>(), sold = new Set<string>();
    for (const e of events) {
      if (e.payload.type === "product_view") saw.add(e.session_id);
      if (e.payload.type === "add_cart" && saw.has(e.session_id)) added.add(e.session_id);
      if (e.payload.type === "begin_checkout" && added.has(e.session_id)) checkout.add(e.session_id);
    }
    const paidIds = new Set(data.orders.filter(paid).map((o) => o.id));
    for (const link of data.links) if (ids.has(link.session_id) && paidIds.has(link.order_id)) sold.add(link.session_id);
    const funnelSold = new Set([...sold].filter((id) => checkout.has(id)));
    return { sessions: selected.length, viewed: saw.size, added: added.size, checkout: checkout.size, paid: funnelSold.size,
      linkedPaidSessions: sold.size, viewToCart: percentage(added.size, saw.size), cartToCheckout: percentage(checkout.size, added.size),
      cartToPaid: percentage(funnelSold.size, added.size), checkoutToPaid: percentage(funnelSold.size, checkout.size),
      sessionToPaid: percentage(sold.size, selected.length) };
  };
  const ids = new Set(sessions.map((s) => s.id));
  const events = data.events.filter((e) => ids.has(e.session_id)).sort((a, b) => a.sequence - b.sequence);
  const sessionGroups = new Map<string, EventRow[]>();
  for (const e of events) { const group = sessionGroups.get(e.session_id) || []; group.push(e); sessionGroups.set(e.session_id, group); }
  const productStats = new Map<number, { id: number; views: number; clicks: number; impressions: number; adds: number }>();
  const ranks: Record<string, { rank: number; productId: number; sessions: number; addedAfterView: number }> = {};
  const transitions: Record<string, number> = {}, errors: Record<string, number> = {};
  const blocks: Record<string, { impressions: number; clicks: number; sessionsWithLaterAdd: number }> = {};
  const carts = new Map<string, { cartId: string; visitorId: string; last: number; checkout: boolean; paid: boolean; pending: boolean; items: Map<string, number> }>();
  const visitors = new Map<string, { visitorId: string; products: Set<number>; categories: Set<number>; adds: Set<number>; firstProducts: number[]; firstClicks: number[]; firstView: Map<number, number>; secondsToAdd: number[]; cartIds: Set<string>; paidCartIds: Set<string> }>();
  for (const row of events) {
    const e = row.payload;
    const v = visitors.get(row.visitor_id) || { visitorId: row.visitor_id, products: new Set<number>(), categories: new Set<number>(), adds: new Set<number>(), firstProducts: [], firstClicks: [], firstView: new Map<number, number>(), secondsToAdd: [], cartIds: new Set<string>(), paidCartIds: new Set<string>() };
    if (e.type === "product_view") { if (!v.products.has(e.productId!)) { v.firstProducts.push(e.productId!); v.firstView.set(e.productId!, Date.parse(row.received_at)); } v.products.add(e.productId!); }
    if (e.type === "product_click" && !v.firstClicks.includes(e.productId!)) v.firstClicks.push(e.productId!);
    if (e.type === "category_view") v.categories.add(e.categoryId!);
    if (e.type === "add_cart") { v.cartIds.add(e.cartId!); if (v.products.has(e.productId!) && !v.adds.has(e.productId!)) { v.adds.add(e.productId!); v.secondsToAdd.push(Math.max(0, (Date.parse(row.received_at) - v.firstView.get(e.productId!)!) / 1000)); } }
    visitors.set(row.visitor_id, v);
  }
  for (const link of data.links) { const v = visitors.get(link.visitor_id), o = orderMap.get(link.order_id); if (v && o && paid(o) && v.cartIds.has(link.cart_id)) v.paidCartIds.add(link.cart_id); }
  let distinctProductTotal = 0, distinctCategoryTotal = 0, productViews = 0, activeSeconds = 0, searches = 0, zeroResultSearches = 0;
  const journeys = sessions.map((session) => {
    const rows = sessionGroups.get(session.id) || [], products = new Set<number>(), categories = new Set<number>(), adds = new Set<number>();
    const firstProducts: number[] = [], firstClicks: number[] = [];
    let previousProduct: number | null = null;
    const clickedBlocks = new Set<string>(), convertedBlocks = new Set<string>();
    for (const { payload: e, received_at: received } of rows) {
      if (e.productId) {
        const p = productStats.get(e.productId) || { id: e.productId, views: 0, clicks: 0, impressions: 0, adds: 0 };
        if (e.type === "product_view") p.views++;
        if (e.type === "product_click") p.clicks++;
        if (e.type === "list_impression") p.impressions++;
        if (e.type === "add_cart") p.adds++;
        productStats.set(p.id, p);
      }
      if (e.type === "product_view") {
        productViews++;
        if (!products.has(e.productId!)) firstProducts.push(e.productId!);
        products.add(e.productId!);
        if (previousProduct !== null && previousProduct !== e.productId) { const key = `${previousProduct} → ${e.productId}`; transitions[key] = (transitions[key] || 0) + 1; }
        previousProduct = e.productId!;
      }
      if (e.type === "product_click" && !firstClicks.includes(e.productId!)) firstClicks.push(e.productId!);
      if (e.type === "category_view") categories.add(e.categoryId!);
      if (e.type === "add_cart" && products.has(e.productId!)) adds.add(e.productId!);
      if (e.type === "active_time") activeSeconds += e.seconds || 0;
      if (e.type === "search") { searches++; if (e.resultCount === 0) zeroResultSearches++; }
      if (e.type === "checkout_error") errors[e.reason!] = (errors[e.reason!] || 0) + 1;
      if (e.block && session.entry_page === "home") {
        blocks[e.block] ||= { impressions: 0, clicks: 0, sessionsWithLaterAdd: 0 };
        if (e.type === "block_impression") blocks[e.block].impressions++;
        if (e.type === "block_click") { blocks[e.block].clicks++; clickedBlocks.add(e.block); }
      }
      if (e.type === "add_cart") for (const block of clickedBlocks) if (!convertedBlocks.has(block)) { blocks[block].sessionsWithLaterAdd++; convertedBlocks.add(block); }
      if (e.cartId) {
        const key = `${session.visitor_id}/${e.cartId}`;
        const cart = carts.get(key) || { cartId: e.cartId, visitorId: session.visitor_id, last: 0, checkout: false, paid: false, pending: false, items: new Map<string, number>() };
        cart.last = Math.max(cart.last, Date.parse(received));
        cart.checkout ||= e.type === "begin_checkout" || e.type === "payment_attempt";
        const line = `${e.productId}/${e.variantId || 0}`;
        if (e.type === "add_cart") cart.items.set(line, (cart.items.get(line) || 0) + e.quantity!);
        if (e.type === "remove_cart") cart.items.delete(line);
        if (e.type === "update_cart") cart.items.set(line, e.quantity!);
        carts.set(key, cart);
      }
    }
    distinctProductTotal += products.size; distinctCategoryTotal += categories.size;
    firstProducts.slice(0, 5).forEach((id, index) => { const key = `${index + 1}/${id}`; ranks[key] ||= { rank: index + 1, productId: id, sessions: 0, addedAfterView: 0 }; ranks[key].sessions++; if (adds.has(id)) ranks[key].addedAfterView++; });
    const sessionOrders = (linksBySession.get(session.id) || []).map((l) => orderMap.get(l.order_id)).filter((o): o is OrderRow => Boolean(o));
    return { ...session, firstProducts: firstProducts.slice(0, 5), firstClicks: firstClicks.slice(0, 5), distinctProducts: products.size, distinctCategories: categories.size,
      productToCart: percentage(adds.size, products.size), observedVisitNumber: visitNumbers.get(session.id) || 1,
      linkedPaid: sessionOrders.some(paid),
      paymentOutcome: sessionOrders.some(paid) ? "paid" : sessionOrders.some((o) => o.payment_status === "pending") ? "pending" : sessionOrders.some((o) => o.payment_status === "failed") ? "failed" : "unknown",
      lastStep: rows.filter((r) => ["checkout_step", "payment_attempt", "begin_checkout"].includes(r.payload.type)).at(-1)?.payload.step || rows.filter((r) => ["payment_attempt", "begin_checkout"].includes(r.payload.type)).at(-1)?.payload.type || "no_checkout_step", eventCount: rows.length };
  });
  for (const link of data.links) {
    const cart = carts.get(`${link.visitor_id}/${link.cart_id}`), order = orderMap.get(link.order_id);
    if (cart && order) { cart.paid ||= paid(order); cart.pending ||= order.payment_status === "pending"; }
  }
  const cartRows = [...carts.values()].map((c) => ({ cartId: c.cartId, visitorId: c.visitorId, distinctLines: c.items.size,
    state: c.paid ? "paid" : c.pending ? "payment_pending" : !c.items.size ? "empty" : now - c.last >= 24 * 3600000 ? "abandoned" : "open",
    lastSeen: new Date(c.last).toISOString(), checkout: c.checkout }));
  const finance = data.orders.filter((o) => paid(o) && Date.parse(o.paid_at!) >= from && Date.parse(o.paid_at!) < now);
  const linked = new Set(data.links.map((l) => l.order_id));
  return { generatedAt: new Date(now).toISOString(), from: new Date(from).toISOString(), filter,
    current: summarize(sessions), previous: summarize(previousSessions), home: summarize(sessions.filter((s) => s.entry_page === "home")),
    finance: { orders: finance.length, gross: finance.reduce((n, o) => n + Number(o.total_amount), 0), refunds: finance.reduce((n, o) => n + Number(o.refunded_amount || 0), 0), unmeasuredOrders: finance.filter((o) => !linked.has(o.id)).length },
    quality: { unfilteredSessions: data.sessions.filter((s) => Date.parse(s.started_at) >= from).length, measuredEvents: events.length,
      staff: data.sessions.filter((s) => Date.parse(s.started_at) >= from && s.traffic === "staff").length, suspected: data.sessions.filter((s) => Date.parse(s.started_at) >= from && s.traffic === "suspected").length,
      lastEvent: events.at(-1)?.received_at || null, previousPeriodComplete: filter.days * 2 <= 30 },
    discovery: { averageProducts: sessions.length ? distinctProductTotal / sessions.length : null, averageCategories: sessions.length ? distinctCategoryTotal / sessions.length : null, productViews,
      repeatViews: productViews - distinctProductTotal, activeSeconds, searches, zeroResultSearches, ranks: Object.values(ranks), transitions },
    products: [...productStats.values()].sort((a, b) => b.views - a.views), blocks, errors, carts: cartRows, journeys,
    visitors: [...visitors.values()].map((v) => ({ visitorId: v.visitorId, distinctProducts: v.products.size, distinctCategories: v.categories.size, firstProducts: v.firstProducts.slice(0, 5), firstClicks: v.firstClicks.slice(0, 5), productToCart: percentage(v.adds.size, v.products.size), cartToPaid: percentage(v.paidCartIds.size, v.cartIds.size), averageSecondsToAdd: v.secondsToAdd.length ? v.secondsToAdd.reduce((n, t) => n + t, 0) / v.secondsToAdd.length : null })),
  };
}
