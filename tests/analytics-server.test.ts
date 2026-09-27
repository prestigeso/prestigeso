import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import ts from "typescript";
function harness(env: Record<string, string> = { RATE_LIMIT_SECRET: "isolated-test-key-".repeat(3) }) {
  let now = 1789650000000, calls = 0;
  const source = ts.transpileModule(readFileSync(new URL("../lib/analytics/server.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  const stubs: Record<string, unknown> = { "server-only": {}, "node:crypto": crypto, "@/lib/supabaseAdmin": { supabaseAdmin: { rpc() { calls++; return { abortSignal: async () => { throw new Error("Synthetic unavailable backend"); } }; } } } };
  new Function("require", "module", "exports", "process", "Date", source)((key: string) => { if (!(key in stubs)) throw new Error(key); return stubs[key]; }, loaded, loaded.exports, { env }, { now: () => now });
  return { api: loaded.exports as typeof import("../lib/analytics/server.ts"), advance: () => { now += 31 * 86400000; }, calls: () => calls };
}
const id = "00000000-0000-4000-8000-000000000001";
const request = (value: string) => ({ cookies: { get: () => ({ value }) } }) as Parameters<typeof import("../lib/analytics/server.ts").readVisitor>[0];
test("signed visitor identity rejects edits, invalid syntax and expiration", () => {
  const h = harness(), token = h.api.signVisitor(id);
  assert.equal(h.api.readVisitor(request(token)), id);
  assert.equal(h.api.readVisitor(request(token.replace(id, "00000000-0000-4000-8000-000000000002"))), null);
  assert.equal(h.api.readVisitor(request("not-a-token")), null);
  h.advance(); assert.equal(h.api.readVisitor(request(token)), null);
});
test("visitor signing uses the strong admin secret when the rate-limit secret is absent", () => {
  const h = harness({ ADMIN_COOKIE_SECRET: "admin-cookie-test-key-".repeat(3) });
  assert.equal(h.api.readVisitor(request(h.api.signVisitor(id))), id);
  assert.throws(() => harness({}).api.signVisitor(id), /ANALYTICS_CONFIGURATION/);
});
test("optional order attribution never throws into checkout when backend fails", async () => {
  const h = harness();
  await h.api.linkAnalyticsOrder(id, { sessionId: id, cartId: id, attemptId: id }, "SYNTHETIC");
  assert.equal(h.calls(), 1);
  await h.api.linkAnalyticsOrder(id, { sessionId: "forged" }, "SYNTHETIC");
  assert.equal(h.calls(), 1);
});
