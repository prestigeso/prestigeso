import { expect, test } from "@playwright/test";

test("storefront navigation and security headers work", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toBeTruthy();
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");

  await page.goto("/shop?q=test&sort=price-asc");
  await expect(page.locator("h1:visible").first()).toContainText("ÜRÜNLER");
});

test("admin APIs reject unauthenticated requests", async ({ request }) => {
  const response = await request.get("/api/admin/lists?resource=orders");
  expect(response.status()).toBe(401);
});

test("PayTR return pages can be embedded without weakening other pages", async ({
  request,
}) => {
  const storefront = await request.get("/");
  const storefrontCsp = storefront.headers()["content-security-policy"] || "";
  expect(storefrontCsp).toContain("frame-ancestors 'self'");
  expect(storefrontCsp).not.toContain(
    "frame-ancestors 'self' https://www.paytr.com",
  );

  for (const path of ["/odeme/basarili", "/odeme/basarisiz"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["x-frame-options"]).toBeUndefined();
    expect(response.headers()["content-security-policy"] || "").toContain(
      "frame-ancestors 'self' https://www.paytr.com",
    );
  }
});
