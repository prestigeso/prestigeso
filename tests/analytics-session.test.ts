import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const id = "00000000-0000-4000-8000-000000000001";

function harness(signingWorks: boolean) {
  let writes = 0;
  class MockResponse extends Response {
    cookies = { set: () => undefined };
    static json(value: unknown, init?: ResponseInit) {
      return new MockResponse(JSON.stringify(value), { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    }
  }
  const stubs: Record<string, unknown> = {
    "node:crypto": { randomUUID: () => id },
    "next/server": { NextResponse: MockResponse },
    "@/lib/adminSecurity": { isTrustedAdminMutationRequest: () => true },
    "@/lib/adminRequest": { isAdminRequest: async () => false },
    "@/lib/rateLimit": { getClientIp: () => "fixture", consumeRateLimit: async () => ({ allowed: true }) },
    "@/lib/supabaseAdmin": { supabaseAdmin: {
      rpc: async () => { writes++; return { data: id, error: null }; },
      from: () => ({ select: () => ({ limit: async () => ({ data: [], error: null }) }) }),
    } },
    "@/lib/http/limitedJson": { limitedJson: async (req: Request) => req.json() },
    "@/lib/analytics/server": {
      ANALYTICS_COOKIE: "prestigeso_measurement",
      readVisitor: () => null,
      signVisitor: () => { if (!signingWorks) throw new Error("ANALYTICS_CONFIGURATION"); return "signed"; },
    },
  };
  const source = ts.transpileModule(readFileSync(new URL("../app/api/analytics/session/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} as { POST: (req: Request) => Promise<Response> } };
  new Function("require", "module", "exports", source)((key: string) => { if (!(key in stubs)) throw new Error(key); return stubs[key]; }, loaded, loaded.exports);
  return {
    send: () => loaded.exports.POST(new Request("https://test.invalid/api/analytics/session", { method: "POST", headers: { origin: "https://test.invalid", "content-type": "application/json" }, body: JSON.stringify({ consent: true, page: "home", source: "search" }) })),
    writes: () => writes,
  };
}

test("unavailable signing never writes an orphan analytics session", async () => {
  const h = harness(false);
  assert.equal((await h.send()).status, 503);
  assert.equal(h.writes(), 0);
});

test("valid signing writes exactly one analytics session", async () => {
  const h = harness(true);
  assert.equal((await h.send()).status, 200);
  assert.equal(h.writes(), 1);
});
