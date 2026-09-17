import { test, expect } from "@playwright/test";
import { createAdminSessionCookie, ADMIN_COOKIE_NAME } from "../../lib/adminAuth";
import { buildAnalyticsReport } from "../../lib/analytics/report";
import type { Dataset } from "../../lib/analytics/report";
const id = "00000000-0000-4000-8000-000000000001";
test.beforeEach(async ({ baseURL }) => { test.skip(!baseURL || !["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname), "Synthetic local tests only"); });
test("phase1 consent gates all events, tracks product/cart and stops on revoke", async ({ page }) => {
  const events: { type: string; productId?: number; [key: string]: unknown }[] = [];
  let opens = 0, deletes = 0;
  await page.route("**/api/analytics/session", (route) => {
    if (route.request().method() === "DELETE") { deletes++; return route.fulfill({ status: 204 }); }
    opens++; return route.fulfill({ json: { visitorId: id, sessionId: id, categories: [{ id: 1, name: "Erkek Kolye" }] } });
  });
  await page.route("**/api/analytics/events", (route) => { events.push(...route.request().postDataJSON()); return route.fulfill({ status: 204 }); });
  await page.goto("/product/247");
  await page.getByRole("button", { name: "Yalnızca zorunlu" }).click();
  await page.waitForTimeout(1200);
  expect(opens).toBe(0); expect(events).toHaveLength(0);
  await page.getByRole("button", { name: "Çerez tercihleri" }).click();
  await page.getByRole("button", { name: "Tümünü kabul et" }).click();
  await expect.poll(() => events.some((e) => e.type === "product_view" && e.productId === 247)).toBe(true);
  await page.locator('[data-testid^="add-to-cart-"]:visible').click();
  await expect.poll(() => events.some((e) => e.type === "add_cart")).toBe(true);
  expect(JSON.stringify(events)).not.toMatch(/"(email|phone|address|token|revenue|url)":/);
  // Close drawer if present, then withdraw permission without navigating away.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Çerez tercihleri" }).click({ force: true });
  await page.getByRole("button", { name: "Yalnızca zorunlu" }).click({ force: true });
  await expect.poll(() => deletes).toBeGreaterThan(0);
  const count = events.length;
  await page.goto("/product/377"); await page.waitForTimeout(1200);
  expect(events.length).toBe(count);
});
test("phase1 denied admin report and forged visitor never expose analytics", async ({ request }) => {
  expect((await request.get("/api/admin/analytics")).status()).toBe(401);
  const result = await request.post("/api/analytics/events", { data: [{ type: "paid", visitorId: id }] });
  expect([401, 403]).toContain(result.status());
});
test("phase1 list positions ignore hidden retained route elements", async ({ page }) => {
  await page.route("**/api/analytics/session", (route) => route.fulfill({ json: { visitorId: id, sessionId: id } }));
  await page.route("**/api/analytics/events", (route) => route.fulfill({ status: 204 }));
  await page.goto("/shop"); await page.getByRole("button", { name: "Tümünü kabul et" }).click();
  await page.evaluate(() => { const hidden = document.createElement("a"); hidden.hidden = true; hidden.href = "/product/247"; document.body.prepend(hidden); });
  await expect(page.locator('a[href^="/product/"]:visible').first()).toHaveAttribute("data-analytics-position", "1");
});
test("phase1 admin screens show honest empty states, filters and API errors", async ({ page, context, baseURL }) => {
  const secret = process.env.PHASE0_ADMIN_TEST_SECRET;
  test.skip(!secret, "Requires isolated local admin test secret");
  await context.addCookies([{ name: ADMIN_COOKIE_NAME, value: await createAdminSessionCookie(secret!), url: baseURL!, httpOnly: true, sameSite: "Lax" }]);
  const report = buildAnalyticsReport({ sessions: [], events: [], orders: [], links: [] }, { days: 7, device: "all", source: "all", traffic: "normal", audience: "all" });
  let fail = false;
  await page.route("**/api/admin/analytics?**", (route) => route.fulfill({ status: fail ? 503 : 200, json: fail ? { error: "Sentetik ölçüm hatası" } : { ...report, timeline: [], timelineTotal: 0 } }));
  await page.goto("/admin/analytics");
  await page.getByRole("button", { name: "Yalnızca zorunlu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mağaza yolculuğu analizi" })).toBeVisible();
  await expect(page.getByText("Veri yok (0/0)", { exact: false }).first()).toBeVisible();
  for (const name of ["Ürün & keşif", "Ana sayfa", "Sepet & ödeme", "Yolculuklar", "Veri kalitesi"]) await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kapsam ve sınırlamalar" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  fail = true; await page.getByRole("button", { name: "Yenile", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Sentetik ölçüm hatası" })).toHaveText("Sentetik ölçüm hatası");
});
test("phase1 consent withdrawal propagates to an already open second tab", async ({ page, context }) => {
  await context.addInitScript(() => localStorage.setItem("prestigeso_cookie_consent", JSON.stringify({ version: "2026-09-17", necessary: true, analytics: true, marketing: false, updatedAt: new Date().toISOString() })));
  const events: unknown[] = [];
  await context.route("**/api/analytics/session", (route) => route.request().method() === "DELETE" ? route.fulfill({ status: 204 }) : route.fulfill({ json: { visitorId: id, sessionId: id } }));
  await context.route("**/api/analytics/events", (route) => { events.push(...route.request().postDataJSON()); return route.fulfill({ status: 204 }); });
  await page.goto("/product/247");
  const other = await context.newPage(); await other.goto("/product/377");
  await expect.poll(() => events.length).toBeGreaterThan(1);
  await other.getByRole("button", { name: "Çerez tercihleri" }).click();
  await other.getByRole("button", { name: "Yalnızca zorunlu" }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.consentAnalytics)).toBe("false");
  const count = events.length;
  await page.waitForTimeout(1300); expect(events.length).toBe(count);
  await other.close();
});
test("phase1 populated admin report exposes real denominators and a readable journey", async ({ page, context, baseURL }, info) => {
  const secret = process.env.PHASE0_ADMIN_TEST_SECRET; test.skip(!secret, "Requires isolated admin secret");
  await context.addCookies([{ name: ADMIN_COOKIE_NAME, value: await createAdminSessionCookie(secret!), url: baseURL!, httpOnly: true, sameSite: "Lax" }]);
  const time = new Date(Date.now() - 3600000).toISOString();
  const dataset: Dataset = {
    sessions: [{ id, visitor_id: id, started_at: time, last_seen: time, entry_page: "home", source: "direct", device: "android", traffic: "normal" }],
    events: (["product_view", "add_cart", "begin_checkout"] as const).map((type, i) => ({ sequence: i + 1, session_id: id, visitor_id: id, received_at: time, payload: { version: 1, eventId: String(i), visitorId: id, sessionId: id, sequence: i + 1, type, page: "product", productId: 247, cartId: id, attemptId: id, quantity: 1 } })),
    orders: [{ id: 1, payment_status: "paid", total_amount: 1000, refunded_amount: 0, paid_at: time, created_at: time }],
    links: [{ order_id: 1, visitor_id: id, session_id: id, cart_id: id, attempt_id: id, created_at: time }],
  };
  const report = buildAnalyticsReport(dataset, { days: 7, device: "all", source: "all", traffic: "normal", audience: "all" });
  await page.route("**/api/admin/analytics?**", (route) => route.fulfill({ json: { ...report, catalog: { "247": { name: "Test Çelik Kolye", sku: "TEST-247" } }, timeline: dataset.events, timelineTotal: dataset.events.length } }));
  await page.goto("/admin/analytics");
  await page.getByRole("button", { name: "Yalnızca zorunlu", exact: true }).click();
  await expect(page.getByText("Ürün → sepet: %100 (1/1)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Yolculuklar", exact: true }).click();
  await page.getByRole("button", { name: /gözlenen oturum/ }).click();
  await expect(page.getByRole("heading", { name: /Seçili takma ziyaretçi/ })).toBeVisible();
  await expect(page.getByText("Test Çelik Kolye (TEST-247)", { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: `tmp/phase1-admin-${info.project.name}.png`, fullPage: true });
});
