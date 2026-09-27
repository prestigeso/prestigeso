"use client";
import { parseCookieConsent, COOKIE_CONSENT_STORAGE_KEY } from "@/lib/legal/consent";
import { safeStorageGet, safeStorageSet, safeStorageRemove } from "@/lib/browserStorage";
import { parseBrowserEvents, type BrowserEvent } from "@/lib/analytics/contract";
type Context = { visitorId: string; sessionId: string; categories?: { id: number; name: string }[] };
type Fields = Partial<Pick<BrowserEvent, "productId" | "variantId" | "categoryId" | "position" | "cartId" | "attemptId" | "quantity" | "resultCount" | "filterCount" | "seconds" | "reason" | "step" | "block">>;
let context: Context | null = null, opening: Promise<Context | null> | null = null;
let memoryCartId: string | null = null, memoryAttemptId: string | null = null;
let sequence = 0, lastActivity = 0, generation = 0, sending = false;
let nextOpenAttemptAt = 0;
let queue: BrowserEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const controllers = new Set<AbortController>();
let pendingDeletion = false, deleting: Promise<boolean> | null = null;
function deleteTracking(): Promise<boolean> {
  if (deleting) return deleting;
  pendingDeletion = true;
  deleting = fetch("/api/analytics/session", { method: "DELETE", keepalive: true, signal: AbortSignal.timeout(5000) })
    .then((r) => { if (r.ok) pendingDeletion = false; return r.ok; }).catch(() => false).finally(() => { deleting = null; });
  return deleting;
}
export function analyticsAllowed() {
  if (typeof document === "undefined" || location.pathname.startsWith("/admin")) return false;
  const applied = document.documentElement.dataset.consentAnalytics;
  return applied ? applied === "true" : parseCookieConsent(safeStorageGet("local", COOKIE_CONSENT_STORAGE_KEY))?.analytics === true;
}
export function analyticsPage(): BrowserEvent["page"] {
  const p = location.pathname;
  return p === "/" ? "home" : p === "/shop" ? "shop" : /^\/product\/\d+\/?$/.test(p) ? "product" : p === "/checkout" ? "checkout" : "other";
}
function source() {
  try {
    // In-app browsers often omit the referrer. Only recognized campaign tags
    // supply a source in that case; an untagged visit remains direct.
    const campaign = new URLSearchParams(location.search).get("utm_source")?.trim().toLowerCase();
    if (campaign && ["instagram", "ig", "facebook", "fb", "tiktok", "whatsapp", "wa", "telegram", "x", "twitter"].includes(campaign)) return "social";
    if (campaign && ["google", "google_ads", "bing", "duckduckgo"].includes(campaign)) return "search";
    if (!document.referrer) return "direct";
    const host = new URL(document.referrer).hostname;
    if (host === location.hostname) return "internal";
    if (/(^|\.)(google\.[a-z.]+|bing.com|duckduckgo.com)$/.test(host)) return "search";
    if (host === "wa.me" || /(^|\.)(whatsapp.com|instagram.com|facebook.com|t.co|x.com|reddit.com|tiktok.com)$/.test(host)) return "social";
  } catch { /* no raw referrer stored */ }
  return "other";
}
async function open(): Promise<Context | null> {
  if (!analyticsAllowed()) return null;
  if (pendingDeletion && !await deleteTracking()) return null;
  if (!analyticsAllowed()) return null;
  if (context && Date.now() - lastActivity < 30 * 60000) return context;
  if (Date.now() < nextOpenAttemptAt) return null;
  if (opening) return opening;
  const current = generation, controller = new AbortController(); controllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), 2000);
  opening = (async () => {
    try {
      const response = await fetch("/api/analytics/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true, page: analyticsPage(), source: source() }), signal: controller.signal });
      if (!response.ok) { nextOpenAttemptAt = Date.now() + 60_000; return null; }
      const result = await response.json() as Context;
      if (current !== generation || !analyticsAllowed()) return null;
      if (typeof result.visitorId !== "string" || typeof result.sessionId !== "string") { nextOpenAttemptAt = Date.now() + 60_000; return null; }
      nextOpenAttemptAt = 0;
      context = result; lastActivity = Date.now();
      return context;
    } catch { nextOpenAttemptAt = Date.now() + 60_000; return null; }
    finally { clearTimeout(timeout); controllers.delete(controller); if (current === generation) opening = null; }
  })();
  return opening;
}
export async function flushAnalytics() {
  if (!analyticsAllowed() || sending || !queue.length) return;
  sending = true;
  const batch = queue.splice(0, 20), current = generation;
  const controller = new AbortController(); controllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    // No persistent offline queue: retention/consent changes cannot leak old events.
    const response = await fetch("/api/analytics/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch), keepalive: true, signal: controller.signal });
    if (response.status === 401 || response.status === 409) context = null;
  } catch { /* reported coverage is incomplete, never block purchase */ }
  finally {
    clearTimeout(timeout); controllers.delete(controller); sending = false;
    if (current === generation && queue.length && analyticsAllowed()) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; void flushAnalytics(); }, 1000);
    }
  }
}
export function trackAnalytics(type: BrowserEvent["type"], fields: Fields = {}) {
  if (!analyticsAllowed()) return;
  const current = generation, page = analyticsPage();
  void open().then((ctx) => {
    if (!ctx || current !== generation || !analyticsAllowed()) return;
    const event: BrowserEvent = { version: 1, eventId: crypto.randomUUID(), visitorId: ctx.visitorId, sessionId: ctx.sessionId, sequence: ++sequence, type, page, ...fields };
    if (!parseBrowserEvents([event])) return;
    lastActivity = Date.now();
    if (queue.length < 100) queue.push(event);
    if (!timer) timer = setTimeout(() => { timer = null; void flushAnalytics(); }, 1000);
  }).catch(() => undefined);
}
export function analyticsCartId() {
  try {
  if (!analyticsAllowed()) return null;
  let id = safeStorageGet("local", "prestigeso_analytics_cart") || memoryCartId;
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) { id = crypto.randomUUID(); safeStorageSet("local", "prestigeso_analytics_cart", id); }
  memoryCartId = id; return id;
  } catch { return null; }
}
export function trackCart(type: "add_cart" | "remove_cart" | "update_cart", productId: number, quantity: number, variantId?: number) {
  const cartId = analyticsCartId();
  if (cartId) trackAnalytics(type, { productId, quantity, cartId, ...(variantId ? { variantId } : {}) });
}
export async function checkoutAnalyticsContext(attemptId: string) {
  try {
  const ctx = await open(); const cartId = analyticsCartId();
  if (!ctx || !cartId || !analyticsAllowed()) return undefined;
  trackAnalytics("payment_attempt", { cartId, attemptId });
  return { sessionId: ctx.sessionId, cartId, attemptId };
  } catch { return undefined; }
}
export function analyticsAttemptId() {
  if (!analyticsAllowed()) return null;
  try {
    let id = safeStorageGet("session", "prestigeso_analytics_attempt") || memoryAttemptId;
    if (!id || !/^[a-f0-9-]{36}$/.test(id)) { id = crypto.randomUUID(); safeStorageSet("session", "prestigeso_analytics_attempt", id); }
    memoryAttemptId = id; return id;
  } catch { return null; }
}
export function trackCheckoutStep(step: BrowserEvent["step"]) {
  const cartId = analyticsCartId(), attemptId = analyticsAttemptId();
  if (cartId && attemptId && step) trackAnalytics("checkout_step", { cartId, attemptId, step });
}
export function trackCheckoutIssue(reason: BrowserEvent["reason"]) {
  const cartId = analyticsCartId(), attemptId = analyticsAttemptId();
  if (cartId && attemptId && reason) trackAnalytics("checkout_error", { cartId, attemptId, reason });
}
export function resetAnalyticsCart() { memoryCartId = null; memoryAttemptId = null; safeStorageRemove("local", "prestigeso_analytics_cart"); safeStorageRemove("session", "prestigeso_analytics_attempt"); }
export function trackCategory(name: string) {
  if (!analyticsAllowed() || !name) return;
  void open().then((ctx) => { const category = ctx?.categories?.find((c) => c.name === name); if (category) trackAnalytics("category_view", { categoryId: Number(category.id) }); }).catch(() => undefined);
}
export function revokeAnalytics() {
  generation++; context = null; opening = null; queue = []; lastActivity = 0; nextOpenAttemptAt = 0;
  for (const controller of controllers) controller.abort(); controllers.clear();
  if (timer) clearTimeout(timer); timer = null;
  const applied = document.documentElement.dataset.consentAnalytics;
  const denied = applied === "false" || (applied !== "true" && parseCookieConsent(safeStorageGet("local", COOKIE_CONSENT_STORAGE_KEY))?.analytics !== true);
  if (!denied) return; // Admin routes suspend collection; they do not withdraw consent.
  resetAnalyticsCart();
  // Only send deletion for an explicit stored denial, not the no-choice first visit.
  if (applied === "false" || safeStorageGet("local", COOKIE_CONSENT_STORAGE_KEY)) void deleteTracking();
}
