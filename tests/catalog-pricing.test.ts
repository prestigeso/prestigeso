import test from "node:test";
import assert from "node:assert/strict";
import {
  getProductUnitPrice,
  getProductOfferSummary,
  getActivePriceCampaign,
  isPriceWindowActive,
} from "../lib/commerce/catalogPricing.ts";
import { buildProductStructuredData } from "../lib/products/structuredData.ts";
import { getShopMetadata } from "../lib/products/shopMetadata.ts";
import { getPurchaseBlockText } from "../lib/products/purchaseState.ts";

const now = Date.parse("2026-09-06T12:00:00Z");
const product = {
  id: 9,
  name: "Ürün",
  SKU: "Q9",
  price: 1000,
  discount_price: 800,
  stock: 12,
};
const campaign = {
  product_ids: [9],
  discount_percent: 30,
  start_date: "2026-09-01T00:00:00Z",
  end_date: "2026-09-30T23:59:59Z",
};

test("fixed and campaign discounts never stack; best current price wins", () => {
  assert.equal(getProductUnitPrice(product, [], null, now), 800);
  assert.equal(getProductUnitPrice(product, [campaign], null, now), 700);
  assert.equal(
    getProductUnitPrice(
      product,
      [{ ...campaign, discount_percent: 10 }],
      null,
      now,
    ),
    800,
  );
  assert.equal(
    getProductUnitPrice(
      product,
      [{ ...campaign, discount_percent: 10 }, campaign],
      null,
      now,
    ),
    700,
  );
});
for (const [label, start, end, expected] of [
  ["future", "2026-10-01", "2026-11-01", 1000],
  ["expired", "2026-08-01", "2026-09-01", 1000],
  ["current", "2026-09-01", "2026-10-01", 800],
  ["invalid", "invalid", "2026-10-01", 1000],
] as const) {
  test(`${label} fixed-discount window is honored`, () =>
    assert.equal(
      getProductUnitPrice(
        { ...product, campaign_start_date: start, campaign_end_date: end },
        [],
        null,
        now,
      ),
      expected,
    ));
}
test("timezones and inclusive exact campaign boundaries match server checks", () => {
  assert.equal(
    isPriceWindowActive(
      "2026-09-06T15:00:00+03:00",
      "2026-09-06T12:00:00Z",
      now,
    ),
    true,
  );
  assert.equal(
    getProductUnitPrice(
      product,
      [{ ...campaign, start_date: "2026-10-01" }],
      null,
      now,
    ),
    800,
  );
  assert.equal(
    getProductUnitPrice(
      product,
      [{ ...campaign, end_date: "2026-09-01" }],
      null,
      now,
    ),
    800,
  );
});
test("unrelated, malformed and 100-percent campaigns cannot create false prices", () => {
  assert.equal(
    getActivePriceCampaign(9, [{ ...campaign, product_ids: "bad json" }], now),
    null,
  );
  assert.equal(
    getProductUnitPrice(
      product,
      [
        { ...campaign, product_ids: [8] },
        { ...campaign, discount_percent: 100 },
      ],
      null,
      now,
    ),
    800,
  );
  assert.equal(
    getProductUnitPrice(
      product,
      [{ ...campaign, product_ids: '["9"]' }],
      null,
      now,
    ),
    700,
  );
});
test("variant-specific prices use campaign but not the parent fixed price", () => {
  const variant = {
    id: 1,
    product_id: 9,
    stock: 1,
    price: 1200,
    is_active: true,
  };
  assert.equal(getProductUnitPrice(product, [], variant, now), 1200);
  assert.equal(getProductUnitPrice(product, [campaign], variant, now), 840);
  assert.equal(
    getProductUnitPrice(product, [campaign], { ...variant, price: null }, now),
    700,
  );
});
test("catalogue starting price excludes sold-out and inactive cheaper variants", () => {
  const variants = [
    { id: 1, product_id: 9, price: 500, stock: 0, is_active: true },
    { id: 2, product_id: 9, price: 900, stock: 3, is_active: true },
    { id: 3, product_id: 9, price: 1200, stock: 2, is_active: true },
    { id: 4, product_id: 9, price: 1, stock: 100, is_active: false },
    { id: 5, product_id: 99, price: 1, stock: 100, is_active: true },
  ];
  assert.deepEqual(getProductOfferSummary(product, [campaign], variants, now), {
    lowPrice: 630,
    highPrice: 840,
    displayBasePrice: 900,
    offerCount: 2,
    hasVariants: true,
    availableStock: 5,
  });
  const data = buildProductStructuredData(
    product,
    [campaign],
    variants,
    "/test.jpg",
    "https://example.com",
    now,
  );
  assert.equal(data.offers["@type"], "AggregateOffer");
  assert.equal("lowPrice" in data.offers && data.offers.lowPrice, 630);
  assert.equal(data.offers.availability, "https://schema.org/InStock");
});
test("sold-out variant products remain OutOfStock even with stale parent stock", () => {
  const variants = [
    { id: 1, product_id: 9, price: null, stock: 0, is_active: true },
  ];
  const data = buildProductStructuredData(
    product,
    [],
    variants,
    "/test.jpg",
    "https://example.com/",
    now,
  );
  assert.equal(data.offers.availability, "https://schema.org/OutOfStock");
  assert.equal(data.offers.url, "https://example.com/product/9");
});
test("ordinary structured offer equals effective checkout price rounded to cents", () => {
  const row = { ...product, price: 9.99, discount_price: 0 };
  const data = buildProductStructuredData(
    row,
    [campaign],
    [],
    "/test.jpg",
    "https://example.com",
    now,
  );
  assert.equal("price" in data.offers && data.offers.price, 6.99);
  assert.equal(getProductUnitPrice(row, [campaign], null, now), 6.99);
});
test("shop category and page have their own canonical while arbitrary facets are noindex", () => {
  const metadata = getShopMetadata({ category: "Erkek Kolye", page: "2" });
  assert.equal(metadata.title, "Erkek Kolye - Sayfa 2");
  assert.equal(
    metadata.alternates.canonical,
    "/shop?category=Erkek+Kolye&page=2",
  );
  assert.equal(metadata.robots.index, true);
  assert.equal(getShopMetadata({ q: "kolye", page: "2" }).robots.index, false);
  assert.equal(
    getShopMetadata({ category: ["Erkek Kolye", "Yüzük"], page: "NaN" })
      .alternates.canonical,
    "/shop?category=Erkek+Kolye",
  );
});
test("purchase state separates loading/error/select-required from genuinely sold-out", () => {
  assert.equal(
    getPurchaseBlockText("loading", false, false, 12, 12),
    "SEÇENEKLER YÜKLENİYOR",
  );
  assert.equal(
    getPurchaseBlockText("error", false, false, 12, 12),
    "BİLGİLER DOĞRULANAMADI",
  );
  assert.equal(
    getPurchaseBlockText("ready", true, false, 0, 12),
    "SEÇENEK SEÇİNİZ",
  );
  assert.equal(getPurchaseBlockText("ready", true, false, 0, 0), "TÜKENDİ");
  assert.equal(getPurchaseBlockText("ready", true, true, 2, 12), null);
});
