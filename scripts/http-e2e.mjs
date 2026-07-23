import assert from "node:assert/strict";

const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";

async function request(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.text() };
}

const home = await request("/");
assert.equal(home.response.status, 200);
assert.match(home.body, /<html[^>]+lang="tr"/i);
assert.match(home.body, /<title>[^<]+<\/title>/i);
assert.ok(home.response.headers.get("content-security-policy"));
assert.equal(home.response.headers.get("x-content-type-options"), "nosniff");

const shop = await request("/shop?q=test&page=2&sort=price-asc");
assert.equal(shop.response.status, 200);
assert.match(shop.body, /TÜM ÜRÜNLER|Ürün bulunamadı/i);

const unauthorized = await request("/api/admin/lists?resource=orders");
assert.equal(unauthorized.response.status, 401);

const telemetry = await request("/api/telemetry/client-error", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "E2E test error", path: "/test" }),
});
assert.equal(telemetry.response.status, 204);

console.log(
  "HTTP E2E: ana sayfa, katalog, güvenlik başlıkları ve admin koruması geçti.",
);
