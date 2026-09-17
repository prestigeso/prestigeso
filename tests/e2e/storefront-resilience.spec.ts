import { expect, test } from "./readonly.fixture";

const id = Number(process.env.PLAYWRIGHT_PRODUCT_ID || "247");
const productPath = `/product/${id}`;
const variant = {
  id: 9022,
  product_id: id,
  sku: "TEST-VARIANT",
  option_values: { Ölçü: "70 cm" },
  price: 1200,
  stock: 3,
  is_active: true,
};
const cart = [
  {
    id,
    name: "Test kolye",
    price: 1000,
    image: "/logo.jpeg",
    quantity: 2,
    stock: 3,
    variant_id: variant.id,
  },
];
const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

test.beforeEach(async ({ baseURL, page }) => {
  // This fault-injection suite must never target a public deployment.
  expect(["127.0.0.1", "localhost", "[::1]"]).toContain(
    new URL(baseURL!).hostname,
  );
  await page.route("**/rest/v1/campaigns?**", (route) =>
    route.fulfill({ status: 200, headers: jsonHeaders, body: "[]" }),
  );
});

test("delayed variants cannot create a variant-less cart, and select-required is not sold-out", async ({
  page,
}, testInfo) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/rest/v1/product_variants?**", async (route) => {
    await gate;
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify([variant]),
    });
  });
  await page.goto(productPath, { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Güncel fiyat ve ürün seçenekleri yükleniyor…").filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByTestId("add-to-cart-desktop")).toHaveCount(0);
  await expect(page.getByTestId("add-to-cart-mobile")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("prestigeso_cart") || "[]"),
    ),
  ).toEqual([]);
  release();
  await page
    .getByRole("button", { name: "Yalnızca zorunlu", exact: true })
    .click();
  await expect(page.getByLabel("Ürün seçeneği", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "SEÇENEK SEÇİNİZ", exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "TÜKENDİ", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Ürün seçeneği", { exact: true })
    .filter({ visible: true })
    .selectOption(String(variant.id));
  const add = page.getByTestId(
    testInfo.project.name === "desktop-chrome"
      ? "add-to-cart-desktop"
      : "add-to-cart-mobile",
  );
  await add.click();
  await expect
    .poll(
      async () =>
        (
          await page.evaluate(() =>
            JSON.parse(localStorage.getItem("prestigeso_cart") || "[]"),
          )
        )[0]?.variant_id,
    )
    .toBe(variant.id);
});

test("variant query errors expose retry and recover without a false sold-out state", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/rest/v1/product_variants?**", (route) =>
    route.fulfill({
      status: failed ? 503 : 200,
      headers: jsonHeaders,
      body: failed
        ? JSON.stringify({ message: "Synthetic unavailable" })
        : JSON.stringify([variant]),
    }),
  );
  await page.goto(productPath, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Yalnızca zorunlu", exact: true })
    .click();
  await expect(
    page.getByText(/Güncel fiyat ve ürün seçenekleri yüklenemedi/).filter({ visible: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId("add-to-cart-desktop")).toHaveCount(0);
  await expect(page.getByTestId("add-to-cart-mobile")).toHaveCount(0);
  failed = false;
  await page.getByRole("button", { name: "Tekrar dene", exact: true }).click();
  await expect(page.getByLabel("Ürün seçeneği", { exact: true }).filter({ visible: true })).toBeVisible();
});

test("cart survives a variant outage plus reload and verifies successfully on explicit retry", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.addInitScript((saved) => {
    if (!localStorage.getItem("prestigeso_cart"))
      localStorage.setItem("prestigeso_cart", JSON.stringify(saved));
  }, cart);
  let failed = true;
  await page.route("**/rest/v1/products?**", (route) =>
    route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify([{ id, price: 1000, discount_price: 0, stock: 3 }]),
    }),
  );
  await page.route("**/rest/v1/product_variants?**", (route) =>
    route.fulfill({
      status: failed ? 503 : 200,
      headers: jsonHeaders,
      body: failed
        ? JSON.stringify({ message: "Synthetic unavailable" })
        : JSON.stringify([variant]),
    }),
  );
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Sepeti tekrar doğrula" }),
  ).toBeVisible({ timeout: 15000 });
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("prestigeso_cart") || "[]"),
    ),
  ).toMatchObject(cart);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Sepeti tekrar doğrula" }),
  ).toBeVisible({ timeout: 15000 });
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("prestigeso_cart") || "[]"),
    ),
  ).toMatchObject(cart);
  failed = false;
  await page.getByRole("button", { name: "Sepeti tekrar doğrula" }).click();
  await expect(
    page.getByRole("button", { name: "Sepeti tekrar doğrula" }),
  ).toHaveCount(0);
  // The retry button disappears at pending, before the query and storage effect finish.
  await expect.poll(async () => (await page.evaluate(() =>
    JSON.parse(localStorage.getItem("prestigeso_cart") || "[]"),
  ))[0]).toMatchObject({
    id,
    variant_id: variant.id,
    quantity: 2,
    price: 1200,
    stock: 3,
  });
});

test("analytics consent denial sends zero counters, acceptance sends once, revocation stops the next visit", async ({
  page,
}) => {
  const counterRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      ["/api/page_views", "/api/product-views"].includes(
        new URL(request.url()).pathname,
      )
    )
      counterRequests.push(request.url());
  });
  await page.goto(productPath, { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Yalnızca zorunlu", exact: true })
    .click();
  await page.waitForTimeout(150);
  expect(counterRequests).toHaveLength(0);
  await page
    .getByRole("button", { name: "Çerez tercihleri", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tümünü kabul et", exact: true })
    .click();
  await expect.poll(() => counterRequests.length).toBe(1);
  await page
    .getByRole("button", { name: "Çerez tercihleri", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Yalnızca zorunlu", exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem("prestige_viewed")),
  ).toBeNull();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(150);
  expect(counterRequests).toHaveLength(1);
});

test("mobile product back action does not overlap the site menu", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "desktop-chrome",
    "Mobile-only navigation control",
  );
  await page.goto(productPath, { waitUntil: "domcontentloaded" });
  const back = page.getByTestId("product-back").filter({ visible: true });
  await expect(back).toBeVisible();
  await expect.poll(() => back.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return hit === element || element.contains(hit);
  })).toBe(true);
});
