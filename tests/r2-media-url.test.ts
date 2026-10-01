import assert from "node:assert/strict";
import test from "node:test";
import {
  parseR2PublicBaseUrl,
  r2KeyFromPublicUrl,
  r2PublicUrlForKey,
} from "../lib/uploads/r2MediaUrl.ts";

test("R2 public URL must be a bare HTTPS origin", () => {
  assert.equal(parseR2PublicBaseUrl(undefined), null);
  for (const value of [
    "http://media.example.com",
    "https://user:pass@media.example.com",
    "https://media.example.com/path",
    "https://media.example.com/?q=1",
    "https://media.example.com:444",
    "https://public-example.r2.dev",
    "https://account.r2.cloudflarestorage.com",
    "https://localhost",
  ]) {
    assert.throws(() => parseR2PublicBaseUrl(value));
  }
});

test("R2 URLs round-trip paths and reject foreign or ambiguous URLs", () => {
  const base = parseR2PublicBaseUrl("https://media.example.com");
  assert.ok(base);
  const key = "admin/product/küpe 1.webp";
  const url = r2PublicUrlForKey(base, key);
  assert.equal(r2KeyFromPublicUrl(base, url), key);
  for (const value of [
    "https://other.example.com/admin/product/a.webp",
    "https://media.example.com/admin/product/a.webp?delete=1",
    "https://media.example.com/admin/%2e%2e/a.webp",
    "https://media.example.com/admin/%5c/a.webp",
    "https://user:pass@media.example.com/admin/product/a.webp",
    "https://media.example.com/admin/%00/a.webp",
    "javascript:alert(1)",
  ]) {
    assert.equal(r2KeyFromPublicUrl(base, value), null);
  }
});

test("R2 URL generation rejects unsafe object paths", () => {
  const base = parseR2PublicBaseUrl("https://media.example.com");
  assert.ok(base);
  for (const key of ["", "/a.webp", "a//b.webp", "../a.webp", "a/../b.webp", "a\\b.webp", "a\u0000.webp"]) {
    assert.throws(() => r2PublicUrlForKey(base, key));
  }
});
