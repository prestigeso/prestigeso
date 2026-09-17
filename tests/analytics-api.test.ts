import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { parseBrowserEvents } from "../lib/analytics/contract.ts";
import { limitedJson } from "../lib/http/limitedJson.ts";
import { isTrustedAdminMutationRequest } from "../lib/adminSecurity.ts";
const id = "00000000-0000-4000-8000-000000000001";
const event = { version: 1, eventId: id, visitorId: id, sessionId: id, sequence: 1, type: "page_view", page: "home" };
function route(visitor: string | null = id, rateAllowed = true) {
  let writes = 0;
  const stubs: Record<string, unknown> = {
    "next/server": { NextResponse: Response },
    "@/lib/adminSecurity": { isTrustedAdminMutationRequest: (r: Request) => isTrustedAdminMutationRequest(r, "https://test.invalid") },
    "@/lib/rateLimit": { getClientIp: () => "fixture", consumeRateLimit: async () => ({ allowed: rateAllowed }) },
    "@/lib/http/limitedJson": { limitedJson },
    "@/lib/analytics/server": { readVisitor: () => visitor },
    "@/lib/analytics/contract": { parseBrowserEvents },
    "@/lib/supabaseAdmin": { supabaseAdmin: { rpc: async () => { writes++; return { error: null }; } } },
  };
  const source = ts.transpileModule(readFileSync(new URL("../app/api/analytics/events/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const loaded = { exports: {} as { POST: (r: Request) => Promise<Response> } };
  new Function("require", "module", "exports", source)((key: string) => { if (!(key in stubs)) throw new Error(key); return stubs[key]; }, loaded, loaded.exports);
  return { send: (body: unknown, origin = "https://test.invalid") => loaded.exports.POST(new Request("https://test.invalid/api/analytics/events", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) })), writes: () => writes };
}
test("analytics rejects cross-origin, unsigned identity and spoofed visitor without writes", async () => {
  const h = route();
  assert.equal((await h.send([event], "https://evil.invalid")).status, 403);
  assert.equal((await route(null).send([event])).status, 401);
  assert.equal((await h.send([{ ...event, visitorId: "00000000-0000-4000-8000-000000000002" }])).status, 400);
  assert.equal(h.writes(), 0);
});
test("analytics rejects unknown PII, browser paid claims, oversized data and rate excess", async () => {
  const h = route();
  assert.equal((await h.send([{ ...event, email: "test@example.invalid" }])).status, 400);
  assert.equal((await h.send([{ ...event, type: "paid" }])).status, 400);
  assert.equal((await h.send([{ ...event, value: "x".repeat(17000) }])).status, 400);
  assert.equal((await route(id, false).send([event])).status, 429);
  assert.equal(h.writes(), 0);
});
test("only validated batch reaches atomic SQL ingestion", async () => {
  const h = route(); assert.equal((await h.send([event])).status, 204); assert.equal(h.writes(), 1);
});
test("limited JSON reader checks actual stream bytes, not only declared length", async () => {
  const request = new Request("https://test.invalid", { method: "POST", headers: { "content-type": "application/json", "content-length": "1" }, body: JSON.stringify({ large: "x".repeat(100) }) });
  await assert.rejects(limitedJson(request, 20), /BODY_LIMIT/);
});
