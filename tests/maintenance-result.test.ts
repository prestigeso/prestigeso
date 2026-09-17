import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import crypto from "node:crypto";

function harness(failResolution: boolean) {
  const writes: unknown[] = [];
  let queries = 0;
  const stubs: Record<string, unknown> = {
    crypto,
    "next/server": { NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } },
    "@/lib/logger": { logServerEvent() {} },
    "@/lib/returnEvidence": { cleanupStaleReturnEvidenceUploads: async () => 0 },
    "@/lib/email/transactionalOutbox": { dispatchPendingTransactionEmails: async () => ({ attempted: 0, sent: 0 }) },
    "@/lib/paytr/queryStatus": { queryPaytrStatus: async () => ({}), comparePaytrStatus: () => ({ status: "matched", detail: {} }) },
    "@/lib/supabaseAdmin": { supabaseAdmin: {
      rpc: async () => ({ data: 0, error: null }),
      from(table: string) {
        let update = false;
        const query = {
          select() { return this; }, in() { return this; }, not() { return this; }, or() { return this; },
          eq() { return this; }, neq() { return this; }, order() { return this; }, limit() { return this; },
          update(value: unknown) { update = true; writes.push(value); return this; },
          then(resolve: (value: unknown) => unknown) {
            if (update) return Promise.resolve(resolve({ data: [], error: table === "payment_recovery_exceptions" && failResolution ? { message: "private-provider-secret" } : null }));
            return Promise.resolve(resolve({ data: queries++ === 0 ? [{ id: 42, merchant_oid: "TEST42", payment_status: "paid", total_amount: 10, paytr_total_amount: 1000 }] : [], error: null }));
          },
        };
        return query;
      },
    } },
  };
  const source = ts.transpileModule(readFileSync(new URL("../app/api/maintenance/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const loaded = { exports: {} as { GET: (req: Request) => Promise<Response> } };
  new Function("require", "module", "exports", "process", source)((name: string) => {
    if (!(name in stubs)) throw new Error(`Unexpected dependency: ${name}`);
    return stubs[name];
  }, loaded, loaded.exports, { env: { CRON_SECRET: "local-test-".repeat(4), PAYTR_MERCHANT_ID: "disabled", PAYTR_MERCHANT_KEY: "disabled", PAYTR_MERCHANT_SALT: "disabled" } });
  return { writes, get: (authorized = true) => loaded.exports.GET(new Request("https://localhost/api/maintenance", {
    headers: { Authorization: `Bearer ${authorized ? "local-test-".repeat(4) : "invalid"}` },
  })) };
}

test("maintenance reports a durable resolution failure without leaking provider text", async () => {
  const h = harness(true); const response = await h.get();
  assert.equal(response.status, 503);
  assert.deepEqual((await response.json()).reconciliationFailures, 1);
  assert.ok(!JSON.stringify(h.writes).includes("private-provider-secret"));
  assert.ok(JSON.stringify(h.writes).includes("RECONCILIATION_FAILED"));
});
test("successful maintenance reports durable reconciliation", async () => {
  const response = await harness(false).get(); const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.success, true); assert.equal(body.reconciled, 1);
});
test("invalid maintenance credential performs no writes", async () => {
  const h = harness(false); assert.equal((await h.get(false)).status, 401); assert.deepEqual(h.writes, []);
});
