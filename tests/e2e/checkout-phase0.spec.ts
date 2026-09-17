import { expect, test } from "./readonly.fixture";
import type { Page } from "@playwright/test";

const provinces = [{ id: 34, name: "İstanbul", districts: [{ id: 10, name: "Kadıköy" }, { id: 20, name: "Beşiktaş" }] }, { id: 6, name: "Ankara", districts: [{ id: 30, name: "Çankaya" }] }];
const reply = (data: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "OK", data }) });
test.beforeEach(async ({ page, baseURL }) => {
  expect(["127.0.0.1", "localhost"]).toContain(new URL(baseURL!).hostname);
  await page.addInitScript(() => {
    localStorage.setItem("prestigeso_cart", JSON.stringify([{ id: 247, name: "Test Çelik Kolye 247", price: 1000, quantity: 1, stock: 20, image: "/logo.jpeg" }]));
    localStorage.setItem("prestigeso_cookie_consent", JSON.stringify({ version: "2026-09-17", necessary: true, analytics: false, marketing: false, updatedAt: new Date().toISOString() }));
  });
  await page.route("**/api/turkiyeapi/provinces**", route => route.fulfill(reply(provinces)));
  await page.route("**/api/turkiyeapi/neighborhoods?**", route => route.fulfill(reply([{ id: 201, name: "Test Mahallesi" }])));
  await page.route("**/api/auth/send-otp", route => route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' }));
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Üye Olmadan Devam Et/ }).click();
  await page.getByPlaceholder("Sipariş bilgilendirmesi için gerekli").fill("checkout-fixture@example.invalid");
});
async function openAddress(page: Page) {
  await page.getByRole("button", { name: /Yeni Adres Ekle/ }).click();
  const dialog = page.getByRole("dialog", { name: "Yeni Adres Ekle" });
  await expect(dialog).toBeVisible();
  return dialog;
}
async function pick(page: Page, label: string, value: string) {
  const dialog = page.getByRole("dialog", { name: "Yeni Adres Ekle" });
  await dialog.getByRole("button", { name: label, exact: true }).click();
  await dialog.getByRole("button", { name: value, exact: true }).click();
}
test("address dialog contains keyboard focus, escapes dropdown first and restores opener", async ({ page }) => {
  const dialog = await openAddress(page);
  await expect(dialog.getByRole("heading")).toBeFocused();
  for (let index = 0; index < 13; index++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await dialog.getByRole("button", { name: "İl *", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: "İl Ara...", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "İl *", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: /Yeni Adres Ekle/ })).toBeFocused();
});
test("neighborhood failure preserves typed address, retry recovers and city reset clears selection", async ({ page }) => {
  let failed = true;
  await page.route("**/api/turkiyeapi/neighborhoods?**", route => route.fulfill(failed ? { status: 503, contentType: "application/json", body: '{}' } : reply([{ id: 201, name: "Test Mahallesi" }])));
  const dialog = await openAddress(page);
  await dialog.getByLabel("Adres Başlığı *", { exact: true }).fill("Yerel Ev");
  await dialog.getByLabel("Açık Adres *", { exact: true }).fill("Sadece yerel test sokağı bina 10");
  await pick(page, "İl *", "İstanbul");
  await pick(page, "İlçe *", "Kadıköy");
  await expect(dialog.getByRole("alert")).toContainText("Mahalleler yüklenemedi");
  await expect(dialog.getByRole("button", { name: /Adresi Kaydet/ })).toBeDisabled();
  await expect(dialog.getByLabel("Açık Adres *", { exact: true })).toHaveValue("Sadece yerel test sokağı bina 10");
  failed = false;
  await dialog.getByRole("button", { name: "Tekrar dene", exact: true }).click();
  await pick(page, "Mahalle *", "Test Mahallesi");
  await expect(dialog.getByRole("button", { name: /Adresi Kaydet/ })).toBeEnabled();
  await pick(page, "İl *", "Ankara");
  await expect(dialog.getByRole("button", { name: "Mahalle *", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: /Adresi Kaydet/ })).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "İlçe *", exact: true })).toContainText("İlçe Seçiniz");
});
test("late first district response cannot replace second district neighborhoods", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let firstStarted = false;
  await page.route("**/api/turkiyeapi/neighborhoods?**", async route => {
    const first = new URL(route.request().url()).searchParams.get("districtId") === "10";
    if (first) { firstStarted = true; await gate; }
    await route.fulfill(reply([{ id: first ? 101 : 201, name: first ? "ESKİ MAHALLE" : "YENİ MAHALLE" }])).catch(() => {});
  });
  const dialog = await openAddress(page);
  await pick(page, "İl *", "İstanbul");
  await pick(page, "İlçe *", "Kadıköy");
  await expect.poll(() => firstStarted).toBe(true);
  await pick(page, "İlçe *", "Beşiktaş");
  await pick(page, "Mahalle *", "YENİ MAHALLE");
  release();
  await expect(dialog.getByRole("button", { name: "Mahalle *", exact: true })).toContainText("YENİ MAHALLE");
  await dialog.getByRole("button", { name: "Mahalle *", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "ESKİ MAHALLE", exact: true })).toHaveCount(0);
});
test("guest contract and OTP dialogs are usable without creating a real payment", async ({ page }) => {
  const forbidden: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/paytr/create-token") forbidden.push(request.url()); });
  const dialog = await openAddress(page);
  await dialog.getByLabel("Adres Başlığı *", { exact: true }).fill("Yerel Ev");
  await dialog.getByLabel("Ad *", { exact: true }).fill("Test");
  await dialog.getByLabel("Soyad *", { exact: true }).fill("Müşteri");
  await dialog.getByLabel("Telefon *", { exact: true }).fill("05555555555");
  await dialog.getByLabel("Açık Adres *", { exact: true }).fill("Yerel test adresi bina 10");
  await pick(page, "İl *", "İstanbul"); await pick(page, "İlçe *", "Kadıköy"); await pick(page, "Mahalle *", "Test Mahallesi");
  await dialog.getByRole("button", { name: /Adresi Kaydet/ }).click();
  await expect(dialog).not.toBeVisible();
  const contractButton = page.getByRole("button", { name: "Mesafeli Satış Sözleşmesi", exact: true });
  await contractButton.click();
  const contract = page.getByRole("dialog", { name: "Ön Bilgilendirme ve Mesafeli Satış Sözleşmesi" });
  await expect(contract).toBeVisible();
  await page.keyboard.press("Escape"); await expect(contractButton).toBeFocused();
  await contractButton.click();
  await contract.getByRole("button", { name: "Okudum, Onaylıyorum", exact: true }).click();
  const payButton = page.getByRole("button", { name: /Ödemeye Geç/ });
  await expect(payButton).toBeEnabled(); await payButton.click();
  const otp = page.getByRole("dialog", { name: "E-Posta Doğrulama" });
  await expect(otp).toBeVisible();
  const code = otp.getByRole("textbox", { name: "6 haneli doğrulama kodu" });
  await expect(code).toBeFocused(); await code.fill("abc12x34567"); await expect(code).toHaveValue("123456");
  await page.keyboard.press("Escape"); await expect(otp).not.toBeVisible(); await expect(payButton).toBeFocused();
  expect(forbidden).toEqual([]);
});
