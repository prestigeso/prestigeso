import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import ts from "typescript";
import * as contract from "../lib/analytics/contract.ts";
import * as consent from "../lib/legal/consent.ts";
const id = "00000000-0000-4000-8000-000000000001";
function harness(blockedStorage = false) {
  const storage = new Map<string, string>();
  const calls: { url: string; method: string; body?: unknown }[] = [];
  const document = { documentElement: { dataset: { consentAnalytics: "true" } }, referrer: "" };
  const location = { pathname: "/product/247", hostname: "test.invalid" };
  const timers = new Map<number, () => void>(); let timerId = 0, failDelete = false;
  const stubs: Record<string, unknown> = {
    "@/lib/legal/consent": consent,
    "@/lib/analytics/contract": contract,
    "@/lib/browserStorage": {
      safeStorageGet: (_kind: string, key: string) => blockedStorage ? null : storage.get(key) || null,
      safeStorageSet: (_kind: string, key: string, value: string) => { if (!blockedStorage) storage.set(key, value); },
      safeStorageRemove: (_kind: string, key: string) => storage.delete(key),
    },
  };
  const source = ts.transpileModule(readFileSync(new URL("../lib/analytics/client.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  const fetch = async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method!, ...(init.body ? { body: JSON.parse(String(init.body)) } : {}) });
    if (init.method === "DELETE") { const status = failDelete ? 503 : 204; failDelete = false; return new Response(null, { status }); }
    return url.endsWith("/session") ? Response.json({ visitorId: id, sessionId: id }) : new Response(null, { status: 204 });
  };
  new Function("require", "module", "exports", "document", "location", "fetch", "crypto", "setTimeout", "clearTimeout", source)(
    (key: string) => { if (!(key in stubs)) throw new Error(key); return stubs[key]; }, loaded, loaded.exports,
    document, location, fetch, webcrypto, (fn: () => void) => { const n = ++timerId; timers.set(n, fn); return n; }, (n: number) => timers.delete(n),
  );
  return { api: loaded.exports as typeof import("../lib/analytics/client.ts"), document, location, storage, calls, failDeletion: () => { failDelete = true; } };
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
test("client never opens tracking without permission", async () => {
  const h = harness(); h.document.documentElement.dataset.consentAnalytics = "false";
  h.api.trackAnalytics("page_view"); await settle(); assert.equal(h.calls.length, 0);
});
test("client batches a burst into bounded packets and stable event IDs", async () => {
  const h = harness();
  for (let i = 0; i < 70; i++) h.api.trackAnalytics("page_view");
  await settle(); for (let i = 0; i < 5; i++) await h.api.flushAnalytics();
  const packets = h.calls.filter((c) => c.url.endsWith("/events")).map((c) => c.body as contract.BrowserEvent[]);
  assert.deepEqual(packets.map((p) => p.length), [20, 20, 20, 10]);
  assert.equal(new Set(packets.flat().map((e) => e.eventId)).size, 70);
});
test("blocked storage retains in-memory cart identity and still submits revocation", async () => {
  const h = harness(true);
  assert.equal(h.api.analyticsCartId(), h.api.analyticsCartId());
  assert.equal(h.api.analyticsAttemptId(), h.api.analyticsAttemptId());
  h.document.documentElement.dataset.consentAnalytics = "false";
  h.api.revokeAnalytics(); await settle();
  assert.equal(h.calls.filter((c) => c.method === "DELETE").length, 1);
});
test("entering admin suspends collection without deleting consented history", async () => {
  const h = harness(); const cart = h.api.analyticsCartId();
  h.location.pathname = "/admin/analytics"; h.api.revokeAnalytics(); await settle();
  assert.equal(h.calls.length, 0);
  h.location.pathname = "/shop"; assert.equal(h.api.analyticsCartId(), cart);
});
test("reconsent completes failed deletion before opening a new identity", async () => {
  const h = harness(); h.failDeletion(); h.document.documentElement.dataset.consentAnalytics = "false";
  h.api.revokeAnalytics(); await settle();
  h.document.documentElement.dataset.consentAnalytics = "true";
  h.api.trackAnalytics("page_view"); await settle();
  assert.deepEqual(h.calls.slice(0, 3).map((c) => c.method), ["DELETE", "DELETE", "POST"]);
});
