import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

type Actions = {
  handleUpdateOrderStatus: (orderId: number, status: string) => Promise<void>;
  handleReturnDecision: (orderId: number, decision: string, note: string) => Promise<void>;
};

function fixture(options: { ok?: boolean; networkError?: boolean; refreshError?: boolean } = {}) {
  const source = readFileSync(new URL("../components/admin/hooks/useOrderActions.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const compiledModule = { exports: {} as { useOrderActions: (options: unknown) => Actions } };
  const toasts: Array<{ message: string; type: string }> = [];
  const warnings: string[] = [];
  let refreshes = 0;
  let requests = 0;
  let localUpdates = 0;
  runInNewContext(compiled, {
    module: compiledModule,
    exports: compiledModule.exports,
    require: (name: string) => {
      if (name === "../adminDb") return { adminDb: async () => ({ error: null }) };
      if (name === "@/lib/utils") return { getErrorMessage: (error: Error, fallback?: string) => error.message || fallback };
      throw new Error(`Unexpected import ${name}`);
    },
    fetch: async () => {
      requests += 1;
      if (options.networkError) throw new Error("PayTR sonucu belirsiz.");
      return {
        ok: options.ok !== false,
        json: async () => options.ok === false
          ? { error: "PayTR iade sonucu doğrulanmalı." }
          : { status: "Kısmi İade", refundAmount: 125.5 },
      };
    },
    console: { warn: (message: string) => warnings.push(message) },
  });
  const actions = compiledModule.exports.useOrderActions({
    setDbOrders: () => { localUpdates += 1; },
    showToast: (message: string, type: string) => toasts.push({ message, type }),
    refreshOrders: async () => {
      refreshes += 1;
      if (options.refreshError) throw new Error("Refresh failed");
    },
  });
  return { actions, toasts, warnings, counts: () => ({ refreshes, requests, localUpdates }) };
}

for (const action of ["return", "financial-status"] as const) {
  const invoke = (actions: Actions) => action === "return"
    ? actions.handleReturnDecision(123, "approve", "")
    : actions.handleUpdateOrderStatus(123, "İade Edildi");

  test(`${action}: refresh runs once after success without repeating the financial request`, async () => {
    const context = fixture();
    await invoke(context.actions);
    assert.deepEqual(context.counts(), { refreshes: 1, requests: 1, localUpdates: 1 });
    assert.equal(context.toasts.length, 1);
    assert.equal(context.toasts[0].type, "success");
  });

  test(`${action}: rejected financial request still refreshes the authoritative state`, async () => {
    const context = fixture({ ok: false });
    await invoke(context.actions);
    assert.deepEqual(context.counts(), { refreshes: 1, requests: 1, localUpdates: 0 });
    assert.equal(context.toasts[0].message, "PayTR iade sonucu doğrulanmalı.");
    assert.equal(context.toasts[0].type, "error");
  });

  test(`${action}: refresh failure cannot mask an ambiguous payment error`, async () => {
    const context = fixture({ networkError: true, refreshError: true });
    await invoke(context.actions);
    assert.deepEqual(context.counts(), { refreshes: 1, requests: 1, localUpdates: 0 });
    assert.equal(context.toasts.length, 1);
    assert.match(context.toasts[0].message, /PayTR sonucu belirsiz/);
    assert.equal(context.toasts[0].type, "error");
    assert.equal(context.warnings.length, 1);
  });
}

test("ordinary status changes do not invoke the financial refresh workflow", async () => {
  const context = fixture();
  await context.actions.handleUpdateOrderStatus(123, "Kargolandı");
  assert.deepEqual(context.counts(), { refreshes: 0, requests: 0, localUpdates: 1 });
});
