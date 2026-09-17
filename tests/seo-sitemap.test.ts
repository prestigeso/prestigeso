import test from "node:test";
import assert from "node:assert/strict";
import {
  readSitemapRows,
  buildSitemapEntries,
} from "../lib/seo/sitemapData.ts";
import { pageMetadata, publicContentPages } from "../lib/seo/pageMetadata.ts";

test("keyset paging includes more than 1000 products and does not stop at a short server-capped page", async () => {
  const source = Array.from({ length: 2505 }, (_, index) => ({
    id: (index + 1) * 3,
  }));
  const cursors: number[] = [];
  const rows = await readSitemapRows(async (afterId, limit) => {
    cursors.push(afterId);
    return {
      data: source
        .filter((row) => row.id > afterId)
        .slice(0, Math.min(limit, 137)),
      error: null,
    };
  });
  assert.deepEqual(rows, source);
  assert.equal(new Set(rows.map((row) => row.id)).size, 2505);
  assert.equal(cursors.length, 20);
});

test("an upstream error after a good page rejects instead of returning an incomplete sitemap", async () => {
  let calls = 0;
  await assert.rejects(
    readSitemapRows(async () => {
      calls++;
      return calls === 1
        ? { data: [{ id: 1 }], error: null }
        : { data: null, error: { code: "UNAVAILABLE" } };
    }),
    /SITEMAP_DATA_UNAVAILABLE/,
  );
});

test("capacity and non-advancing page protections fail explicitly, never truncate silently", async () => {
  await assert.rejects(
    readSitemapRows(
      async (afterId) => ({ data: [{ id: afterId + 1 }], error: null }),
      2,
      1,
    ),
    /CAPACITY_EXCEEDED/,
  );
  await assert.rejects(
    readSitemapRows(async () => ({ data: [{ id: 1 }], error: null })),
    /INVALID_PAGE_ORDER/,
  );
  await assert.rejects(
    readSitemapRows(async () => ({ data: [{ id: -1 }], error: null })),
    /INVALID_PAGE_ORDER/,
  );
});

test("lastmod reflects actual updated_at, not creation time or build time; missing dates remain absent", () => {
  const result = buildSitemapEntries(
    "https://www.example.com/",
    [
      {
        id: 1,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-09-05T00:00:00Z",
      },
      { id: 2, created_at: "2026-02-01T00:00:00Z" },
      { id: 3 },
    ],
    [],
  );
  assert.equal(
    (
      result.find((row) => row.url.endsWith("/product/1"))?.lastModified as Date
    ).toISOString(),
    "2026-09-05T00:00:00.000Z",
  );
  assert.equal(
    (
      result.find((row) => row.url.endsWith("/product/2"))?.lastModified as Date
    ).toISOString(),
    "2026-02-01T00:00:00.000Z",
  );
  assert.equal(
    result.find((row) => row.url.endsWith("/product/3"))?.lastModified,
    undefined,
  );
  assert.equal(
    result.find((row) => row.url.endsWith("/hakkimizda"))?.lastModified,
    undefined,
  );
  assert.throws(
    () =>
      buildSitemapEntries(
        "https://example.com",
        [{ id: 1, updated_at: "invalid" }],
        [],
      ),
    /INVALID_UPDATED_AT/,
  );
});

test("category sitemap uses the same canonical encoding and includes sold-out product pages", () => {
  const result = buildSitemapEntries(
    "https://example.com",
    [{ id: 5 }, { id: 6 }],
    [
      { id: 1, name: "Erkek Kolye" },
      { id: 2, name: "Yüzük & Bileklik" },
      { id: 3, name: " Erkek Kolye " },
    ],
  );
  assert.equal(
    result.filter((row) => row.url.endsWith("/shop?category=Erkek+Kolye"))
      .length,
    1,
  );
  assert.equal(
    result.some((row) =>
      row.url.endsWith("/shop?category=Y%C3%BCz%C3%BCk+%26+Bileklik"),
    ),
    true,
  );
  assert.equal(result.filter((row) => row.url.includes("/product/")).length, 2);
  assert.equal(
    result.some((row) =>
      /checkout|profile|admin|login|odeme|siparis-takip/.test(row.url),
    ),
    false,
  );
});

test("metadata contract identifies every public path and excludes private utility pages from indexing", () => {
  for (const [path, [title, description]] of Object.entries(
    publicContentPages,
  )) {
    const metadata = pageMetadata(path, title, description);
    assert.equal(metadata.alternates?.canonical, path);
    assert.deepEqual(metadata.robots, { index: true, follow: true });
  }
  const privateMetadata = pageMetadata(
    "/admin/login",
    "Giriş",
    "Yönetici",
    true,
  );
  assert.deepEqual(privateMetadata.robots, { index: false, follow: false });
  assert.equal(privateMetadata.referrer, "no-referrer");
  assert.equal(privateMetadata.alternates?.canonical, "/admin/login");
});
