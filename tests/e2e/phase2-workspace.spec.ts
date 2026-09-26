import { test, expect } from "@playwright/test";
import { createAdminSessionCookie, ADMIN_COOKIE_NAME } from "../../lib/adminAuth";
test.beforeEach(async ({ context, baseURL }) => {
  test.skip(!baseURL || !["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname), "Isolated test only");
  const secret = process.env.PHASE0_ADMIN_TEST_SECRET; test.skip(!secret, "Requires local fixture secret");
  await context.addCookies([{ name: ADMIN_COOKIE_NAME, value: await createAdminSessionCookie(secret!), url: baseURL!, httpOnly: true, sameSite: "Lax" }]);
});
test("phase2 finance preserves unknowns and computes explicit cohort contribution", async ({ page }) => {
  await page.goto("/admin/phase2"); await page.getByRole("button", { name: "Yalnızca zorunlu", exact: true }).click();
  await page.getByRole('navigation', { name: 'Çalışma alanı bölümleri' }).getByRole('button', { name: 'Finans', exact: true }).click();
  await page.getByRole('button', { name: 'Katkı senaryosu', exact: true }).click();
  await page.getByRole("checkbox").check();
  await expect(page.getByText("Reklam sonrası katkı: Eksik veri", { exact: true })).toBeVisible();
  for (const [field, value] of Object.entries({ revenue: "1000", refunds: "100", goods: "300", paymentFees: "30", packaging: "20", shipping: "50", returnCosts: "10", advertising: "100" })) await page.locator(`#finance-${field}`).fill(value);
  await expect(page.getByText(/Reklam sonrası katkı:.*390/)).toBeVisible();
  await page.locator("#finance-revenue").fill("1e3"); await expect(page.getByRole("alert").filter({ hasText: "Hatalı tutarları" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("phase2 provider list is manual, handles failures and does not expose customer PII", async ({ page }) => {
  let calls = 0, fail = false;
  await page.route("**/api/admin/trendyol/packages?**", (route) => { calls++; return route.fulfill({ status: fail ? 502 : 200, json: fail ? { error: "Trendyol verisi doğrulanamadı." } : { page: 0, total: 1, totalPages: 1, hasNext: false, environment: "stage", fetchedAt: new Date().toISOString(), packages: [{ packageId: "42", orderNumber: "12345", status: "Created", amount: 1000, currency: "TRY", lines: [{ sku: "Q316", name: "Test kolye", quantity: 1 }] }] } }); });
  await page.goto("/admin/phase2"); await page.getByRole("button", { name: "Yalnızca zorunlu", exact: true }).click();
  await page.getByRole('navigation', { name: 'Çalışma alanı bölümleri' }).getByRole('button', { name: 'Trendyol', exact: true }).click();
  expect(calls).toBe(0); await page.getByRole("button", { name: "Trendyol paketlerini getir" }).click();
  await expect(page.getByText("1 × Test kolye (Q316)")).toBeVisible(); expect(calls).toBe(1);
  fail = true; await page.getByRole("button", { name: "Trendyol paketlerini getir" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Trendyol verisi" })).toBeVisible();
  await expect(page.getByText("1 × Test kolye (Q316)")).toHaveCount(0);
});
test("phase2 provider API rejects unauthenticated requests and is disabled in fixture", async ({ playwright, context, baseURL }) => {
  const anonymous = await playwright.request.newContext({ baseURL, ignoreHTTPSErrors: true });
  try { expect((await anonymous.get("/api/admin/trendyol/packages")).status()).toBe(401); } finally { await anonymous.dispose(); }
  expect((await context.request.get("/api/admin/trendyol/packages", { headers: { Origin: baseURL! } })).status()).toBe(503);
});

test('phase2 records preserve idempotency key after ambiguous save and display history', async ({ page }) => {
  const ids: string[] = [];
  await page.route('**/api/admin/phase2/records**', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { records: [], truncated: false } });
    const body = route.request().postDataJSON(); ids.push(body.requestId);
    return route.fulfill({ status: ids.length === 1 ? 503 : 200, json: ids.length === 1 ? { error: 'Kaydetme doğrulanamadı.' } : { version: 1 } });
  });
  await page.goto('/admin/phase2'); await page.getByRole('button', { name: 'Yalnızca zorunlu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Çalışma alanı bölümleri' }).getByRole('button', { name: 'Finans', exact: true }).click();
  await page.getByLabel('Kayıt anahtarı').filter({ visible: true }).fill('Q316');
  await page.getByRole('button', { name: 'Güncel kaydı yükle' }).click();
  await page.getByLabel('Kaynak / düzeltme gerekçesi (kişisel veri yazmayın)').filter({ visible: true }).fill('Test cost receipt');
  await page.getByRole('button', { name: 'Kaydı kaydet', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Kaydetme doğrulanamadı' })).toBeVisible();
  await page.getByRole('button', { name: 'Kaydı kaydet', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Kaydedildi' })).toBeVisible();
  expect(ids).toHaveLength(2); expect(ids[0]).toBe(ids[1]);
});

test('phase2 Google final PT report clears stale data on failure', async ({ page }) => {
  let fail = false;
  await page.route('**/api/admin/phase2/search-console?**', route => route.fulfill({ status: fail ? 502 : 200, json: fail ? { error: 'Google raporu alınamadı.' } : { query: { startRow: 0 }, rows: [{ key: 'test arama', clicks: 2, impressions: 10, ctr: 0.2, position: 3 }], fetchedAt: '2026-09-19', hasNext: false } }));
  await page.goto('/admin/phase2'); await page.getByRole('button', { name: 'Yalnızca zorunlu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Çalışma alanı bölümleri' }).getByRole('button', { name: 'Google', exact: true }).click();
  await page.getByLabel('Başlangıç (PT)').filter({ visible: true }).fill('2026-08-01'); await page.getByLabel('Bitiş (PT)').filter({ visible: true }).fill('2026-08-31');
  await page.getByRole('button', { name: 'Google raporunu getir' }).click(); await expect(page.getByText('test arama', { exact: true })).toBeVisible();
  fail = true; await page.getByRole('button', { name: 'Google raporunu getir' }).click(); await expect(page.getByText('test arama', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('alert').filter({ hasText: 'Google raporu' })).toBeVisible();
});

test('phase2 new APIs require admin and mutations reject cross-origin', async ({ playwright, context, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL, ignoreHTTPSErrors: true });
  try {
    for (const route of ['records?kind=product_cost', 'order?id=1', 'search-console', 'search-console/status']) expect((await anon.get(`/api/admin/phase2/${route}`)).status()).toBe(401);
  } finally { await anon.dispose(); }
  expect((await context.request.post('/api/admin/phase2/records', { headers: { Origin: 'https://attacker.invalid' }, data: {} })).status()).toBe(401);
  expect((await context.request.get('/api/admin/phase2/search-console')).status()).toBe(503);
  expect((await context.request.get('/api/admin/phase2/search-console/status')).status()).toBe(503);
});

test('Google connection clears stale success and offers calendar presets', async ({ page }) => {
  let calls = 0, fail = false;
  await page.route('**/api/admin/phase2/search-console/status', route => { calls++; return route.fulfill({ status: fail ? 502 : 200, json: fail ? { error: 'Google oturumu yenilenemedi.' } : { property: 'sc-domain:prestigeso.com.tr', permission: 'siteOwner', checkedAt: '2026-09-20T00:00:00Z' } }); });
  await page.goto('/admin/phase2'); await page.getByRole('button', { name: 'Yalnızca zorunlu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Çalışma alanı bölümleri' }).getByRole('button', { name: 'Google', exact: true }).click();
  expect(calls).toBe(0);
  // The final-data window is prefilled; opening Google may read it once.
  await expect(page.getByRole('button', { name: 'Google raporunu getir', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '28 günlük aralık', exact: true }).click();
  await expect(page.getByLabel('Başlangıç (PT)').filter({ visible: true })).not.toHaveValue('');
  await expect(page.getByRole('button', { name: 'Google raporunu getir', exact: true })).toBeEnabled();
  await page.getByRole('main').getByText('Bağlantı ve veri kapsamı', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Google bağlantısını kontrol et', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Google bağlantısını kontrol et', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Google bağlantısı doğrulandı' })).toBeVisible();
  fail = true; await page.getByRole('button', { name: 'Google bağlantısını kontrol et', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Google bağlantısı doğrulandı' })).toHaveCount(0);
  await expect(page.getByRole('alert').filter({ hasText: 'Google oturumu yenilenemedi.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('phase2 durable stream reads on entry but advances only explicitly', async ({ page }) => {
  const actions: string[] = []; let reads = 0, complete = false;
  await page.route('**/api/admin/trendyol/sync', route => {
    if (route.request().method() === 'POST') {
      actions.push(route.request().postDataJSON().action); complete = true;
      return route.fulfill({ json: { complete: true } });
    }
    reads++;
    return route.fulfill({ json: { environment: 'stage', truncated: false, mappings: { Q316: 'Q316' }, jobs: [{ id: 'local-job', revision: complete ? 2 : 1, status: complete ? 'complete' : 'ready' }], packages: [{ package_id: '42', seen_at: '2026-09-19', payload: { orderNumber: 'SYNTHETIC-42', status: 'Created', amount: 100, currency: 'TRY', lines: [{ sku: 'Q316', name: 'Yerel kolye', quantity: 1 }] } }] } });
  });
  await page.goto('/admin/phase2'); await page.getByRole('button', { name: 'Yalnızca zorunlu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Çalışma alanı bölümleri' }).getByRole('button', { name: 'Trendyol', exact: true }).click();
  await page.getByRole('heading', { name: 'Trendyol kalıcı aktarım & eşleme' }).scrollIntoViewIfNeeded();
  await expect.poll(() => reads).toBe(1); expect(actions).toHaveLength(0);
  await page.getByRole('button', { name: 'Kayıtları ve işleri yenile' }).click();
  await expect(page.getByText(/local-job.*Devam bekliyor/)).toBeVisible();
  await page.getByRole('button', { name: 'Sonraki adım', exact: true }).click();
  await expect(page.getByText(/local-job.*Tamamlandı/)).toBeVisible();
  expect(actions).toEqual(['step']);
  await expect(page.getByRole('button', { name: 'Sonraki adım', exact: true })).toHaveCount(0);
});

test('phase2 inspection clears old status and offline integrations fail closed', async ({ page, context, baseURL, playwright }) => {
  let fail = false;
  await page.route('**/api/admin/phase2/inspection', route => route.fulfill({ status: fail ? 503 : 200, json: fail ? { error: 'Denetim kapalı.' } : { fetchedAt: '2026-09-19', status: { coverageState: 'SYNTHETIC_INDEXED' } } }));
  await page.goto('/admin/phase2'); await page.getByRole('button', { name: 'Yalnızca zorunlu', exact: true }).click();
  await page.getByRole('navigation', { name: 'Çalışma alanı bölümleri' }).getByRole('button', { name: 'Google', exact: true }).click();
  await page.getByRole('button', { name: 'İndeks kaydını denetle' }).click();
  await expect(page.getByText('SYNTHETIC_INDEXED', { exact: true })).toBeVisible();
  fail = true; await page.getByRole('button', { name: 'İndeks kaydını denetle' }).click();
  await expect(page.getByText('SYNTHETIC_INDEXED', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Denetim kapalı.' })).toBeVisible();
  // The synthetic production build retains this configured canonical origin;
  // these requests still go exclusively to the loopback test server.
  const headers = { Origin: 'https://www.prestigeso.com.tr' };
  expect((await context.request.post('/api/admin/phase2/inspection', { headers, data: { url: 'https://www.prestigeso.com.tr/' } })).status()).toBe(503);
  expect((await context.request.post('/api/admin/trendyol/sync', { headers, data: { action: 'start' } })).status()).toBe(503);
  const anon = await playwright.request.newContext({ baseURL, ignoreHTTPSErrors: true });
  try {
    expect((await anon.get('/api/admin/phase2/preparation')).status()).toBe(401);
    expect((await anon.get('/api/admin/trendyol/sync')).status()).toBe(401);
  } finally { await anon.dispose(); }
});

test('admin design preserves forms across sections and fits each viewport', async ({ page }, testInfo) => {
  const providerCalls: string[] = [];
  await page.route('**/api/admin/phase2/search-console**', route => { providerCalls.push(route.request().method()); return route.fulfill({ status: 503, json: { error: 'Yerel test: bağlantı kapalı.' } }); });
  await page.route('**/api/admin/trendyol/**', route => { providerCalls.push(route.request().method()); return route.fulfill({ status: 503, json: { error: 'Yerel test: bağlantı kapalı.' } }); });
  await page.goto('/admin/phase2');
  await page.getByRole('button', { name: 'Yalnızca zorunlu', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Çalışma alanı bölümleri' });
  for (const name of ['Genel bakış', 'Finans', 'Trendyol', 'Google', 'Meta']) {
    await nav.getByRole('button', { name, exact: true }).click();
    await expect(nav.getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`admin-${name.replaceAll(' ', '-')}.png`), fullPage: true });
  }
  expect(providerCalls.length).toBeLessThanOrEqual(2);
  expect(providerCalls.every(method => method === 'GET')).toBe(true);
  await nav.getByRole('button', { name: 'Finans', exact: true }).click();
  await page.getByRole('button', { name: 'Katkı senaryosu', exact: true }).click();
  await page.locator('#finance-revenue').fill('1234');
  await nav.getByRole('button', { name: 'Google', exact: true }).click();
  await nav.getByRole('button', { name: 'Finans', exact: true }).click();
  await expect(page.locator('#finance-revenue')).toHaveValue('1234');
  for (const [path, name] of [['/admin/analytics', 'Müşteri yolculuğu'], ['/admin/analysis', 'Satış analizi']]) {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Yönetim raporları' }).getByRole('link', { name, exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Rapor hazırlanıyor…', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${path.split('/').pop()}.png`), fullPage: true });
  }
});
