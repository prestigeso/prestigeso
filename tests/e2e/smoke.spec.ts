import { expect, test } from "@playwright/test";

test("storefront navigation and security headers work", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(response?.headers()["content-security-policy"]).toBeTruthy();
  await expect(page.locator("html")).toHaveAttribute("lang", "tr");

  await page.goto("/shop?q=test&sort=price-asc");
  await expect(page.locator("h1")).toContainText("ÜRÜNLER");
});

test("admin APIs reject unauthenticated requests", async ({ request }) => {
  const response = await request.get("/api/admin/lists?resource=orders");
  expect(response.status()).toBe(401);
});
