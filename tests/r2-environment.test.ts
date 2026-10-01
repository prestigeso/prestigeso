import assert from "node:assert/strict";
import test from "node:test";
import { validateR2Environment } from "../scripts/lib/r2-environment.mjs";

const valid = {
  PRODUCT_MEDIA_BACKEND: "r2",
  R2_ACCOUNT_ID: "a".repeat(32),
  R2_BUCKET: "prestigeso-product-media",
  R2_ACCESS_KEY_ID: "b".repeat(32),
  R2_SECRET_ACCESS_KEY: "c".repeat(64),
  R2_PUBLIC_BASE_URL: "https://media.example.com",
};

test("R2 remains optional while Supabase is active", () => {
  assert.deepEqual(validateR2Environment({}), []);
  assert.deepEqual(validateR2Environment({ PRODUCT_MEDIA_BACKEND: "supabase" }), []);
  assert.deepEqual(validateR2Environment({ PRODUCT_MEDIA_BACKEND: "wrong" }), ["PRODUCT_MEDIA_BACKEND"]);
});

test("R2 cannot be enabled with missing credentials or domain", () => {
  assert.deepEqual(validateR2Environment(valid), []);
  for (const name of Object.keys(valid).filter((key) => key !== "PRODUCT_MEDIA_BACKEND")) {
    assert.deepEqual(validateR2Environment({ ...valid, [name]: "" }), [name]);
  }
});

test("R2 configuration rejects unsafe and development domains without exposing secrets", () => {
  for (const value of ["http://media.example.com", "https://user:pass@media.example.com", "https://x.r2.dev", "https://x.r2.cloudflarestorage.com", "https://media.example.com/path", "https://media.example.com:444", "https://localhost"]) {
    assert.deepEqual(validateR2Environment({ ...valid, R2_PUBLIC_BASE_URL: value }), ["R2_PUBLIC_BASE_URL"]);
  }
  assert.deepEqual(validateR2Environment({ ...valid, R2_SECRET_ACCESS_KEY: "secret-value" }), ["R2_SECRET_ACCESS_KEY"]);
});
