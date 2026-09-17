import { expect, test } from "./readonly.fixture";

function canonical(html: string) {
  const tag = html.match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0];
  const href = tag?.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  return href ? new URL(href) : null;
}
function robots(html: string) {
  return html.match(/<meta\b[^>]*name="robots"[^>]*>/)?.[0] || "";
}

test("public content pages advertise their own canonical, not home", async ({
  request,
}) => {
  for (const path of [
    "/hakkimizda",
    "/iletisim",
    "/teslimat-bilgileri",
    "/guvenlik-ve-iade",
    "/gizlilik-politikasi",
    "/gizlilik-ilkeleri",
    "/kvkk",
    "/uyelik-sozlesmesi",
    "/mesafeli-satis-sozlesmesi",
  ]) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    const html = await response.text();
    expect(canonical(html)?.pathname, path).toBe(path);
    expect(robots(html), path).not.toContain("noindex");
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1], path).not.toMatch(
      /PrestigeSO.*PrestigeSO/,
    );
  }
});

test("private account, payment and admin entry pages are noindex with query-free canonical", async ({
  request,
}) => {
  for (const path of [
    "/admin/login",
    "/checkout",
    "/profile",
    "/login",
    "/siparis-takip",
    "/update-password",
    "/odeme/basarili",
    "/odeme/basarisiz",
  ]) {
    const response = await request.get(
      `${path}?test_private_token=not-a-secret`,
      { maxRedirects: 0 },
    );
    expect(response.ok(), path).toBe(true);
    const html = await response.text();
    expect(robots(html), path).toContain("noindex");
    expect(canonical(html)?.pathname, path).toBe(path);
    expect(canonical(html)?.search, path).toBe("");
  }
});

test("category page 2 has category title and its own canonical; facets are noindex", async ({
  request,
}) => {
  const response = await request.get("/shop?category=Erkek%20Kolye&page=2");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(canonical(html)?.searchParams.get("category")).toBe("Erkek Kolye");
  expect(canonical(html)?.searchParams.get("page")).toBe("2");
  expect(html.match(/<title>([^<]*)<\/title>/)?.[1]).toContain(
    "Erkek Kolye - Sayfa 2",
  );
  const filtered = await request.get("/shop?q=kolye&sort=price-asc");
  expect(robots(await filtered.text())).toContain("noindex");
});

test("sitemap contains category/product routes and excludes transactional/private URLs", async ({
  request,
}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  expect(xml).toContain("/product/247</loc>");
  expect(xml).toContain("/product/377</loc>");
  expect(xml).toContain("/shop?category=Erkek+Kolye</loc>");
  expect(xml).not.toMatch(
    /<loc>[^<]*\/(?:checkout|profile|admin|login|odeme|siparis-takip)/,
  );
});
