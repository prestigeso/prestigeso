import { expect, test } from "./readonly.fixture";

const productPath = `/product/${process.env.PLAYWRIGHT_PRODUCT_ID || "247"}`;

const publicRoutes = [
  "/",
  "/shop",
  productPath,
  "/login",
  "/siparis-takip",
  "/iletisim",
  "/guvenlik-ve-iade",
];

for (const route of publicRoutes) {
  test(`${route} has no horizontal overflow or broken images`, async ({
    page,
  }) => {
    const imageFailures: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/_next/image") && !response.ok()) {
        imageFailures.push(`${response.status()} ${response.url()}`);
      }
    });
    page.on("requestfailed", (request) => {
      if (request.url().includes("/_next/image")) {
        imageFailures.push(
          `${request.failure()?.errorText || "request failed"} ${request.url()}`,
        );
      }
    });
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${route} HTTP status`).toBe(200);
    await page.waitForTimeout(1200);

    const audit = await page.evaluate(() => ({
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      brokenImages: Array.from(document.images)
        .filter((image) => {
          const rect = image.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            image.complete &&
            image.naturalWidth === 0
          );
        })
        .map((image) => image.currentSrc || image.src),
    }));

    expect(audit.overflow, `${route} yatay taşıyor`).toBe(false);
    expect(
      audit.brokenImages,
      `${route} kırık görsel içeriyor: ${imageFailures.join(" | ")}`,
    ).toEqual([]);
    await expect(
      page.getByRole("heading", { name: "Sayfa Bulunamadı", exact: true }),
      `${route} beklenmedik 404 gösteriyor`,
    ).toHaveCount(0);
  });
}

test("product can be added to cart and checkout opens", async ({
  page,
}, testInfo) => {
  await page.goto(productPath, { waitUntil: "domcontentloaded" });
  const addToCartTestId =
    testInfo.project.name === "desktop-chrome"
      ? "add-to-cart-desktop"
      : "add-to-cart-mobile";
  const addToCart = page
    .getByTestId(addToCartTestId)
    .filter({ visible: true });
  await expect(addToCart).toHaveCount(1, { timeout: 15_000 });
  await expect(addToCart).toBeVisible();
  await page.waitForTimeout(2000);
  await addToCart.click();
  await page.waitForFunction(() => {
    const cart = JSON.parse(localStorage.getItem("prestigeso_cart") || "[]");
    return Array.isArray(cart) && cart.length === 1;
  });

  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Sepetimdeki Ürünler (1)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nasıl Devam Etmek İstersiniz?" }),
  ).toBeVisible();
});
