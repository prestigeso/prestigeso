import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { RefundError } from "../lib/paytr/refundError.ts";
import { runRefundWorkflow, type RefundDependencies, type RefundOrderRow } from "../lib/paytr/refundWorkflow.ts";

const input = { orderId: 1, newStatus: "İade Edildi" as const, returnRequestId: 10, refundAmount: 25 };

function fixture(overrides: Partial<RefundOrderRow> = {}) {
  const order: RefundOrderRow = {
    id: 1, user_id: "test-user", merchant_oid: "PRSTESTORDER", total_amount: "100.00",
    refunded_amount: "0.00", payment_status: "paid", status: "İade Talebi", refund_started_at: null,
    ...overrides,
  };
  const calls = { provider: 0, release: 0, save: 0, stock: 0, fullStock: 0, mark: 0 };
  let reply: (init?: RequestInit) => Promise<Response> = async (init) => {
    const body = new URLSearchParams(String(init?.body));
    return Response.json({ status: "success", merchant_oid: body.get("merchant_oid"), return_amount: body.get("return_amount"), reference_no: body.get("reference_no") });
  };
  const deps: RefundDependencies = {
    credentials: { merchantId: "test-id", merchantKey: "test-key", merchantSalt: "test-salt" },
    now: () => "2026-09-06T12:00:00.000Z",
    fetch: async (_url, init) => {
      calls.provider++;
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "error");
      assert.ok(init?.signal);
      return reply(init);
    },
    repository: {
      async getOrder() { return { ...order }; },
      async claimOrder(snapshot, at) {
        if (order.refund_started_at || order.status !== snapshot.status ||
            order.refunded_amount !== snapshot.refunded_amount || order.total_amount !== snapshot.total_amount ||
            order.payment_status !== snapshot.payment_status) return false;
        order.refund_started_at = at;
        return true;
      },
      async releaseClaim(_id, at) {
        calls.release++;
        if (order.refund_started_at !== at) return false;
        order.refund_started_at = null;
        return true;
      },
      async saveRefund(_snapshot, at, update) {
        calls.save++;
        if (order.refund_started_at !== at) return false;
        Object.assign(order, update);
        return true;
      },
      async markStockReleased() { calls.mark++; },
    },
    releaseReturnStock: async () => { calls.stock++; },
    releaseOrderStock: async () => { calls.fullStock++; },
  };
  return { order, calls, deps, setReply(fn: typeof reply) { reply = fn; } };
}

function unsafe(error: unknown) {
  assert.ok(error instanceof RefundError);
  assert.equal(error.retrySafe, false);
  return true;
}

test("partial refund validates the provider and saves money before returning selected stock", async () => {
  const f = fixture();
  const result = await runRefundWorkflow(input, f.deps);
  assert.equal(result.refundAmount, 25);
  assert.equal(result.fullyRefunded, false);
  assert.equal(f.order.refunded_amount, 25);
  assert.equal(f.order.payment_status, "partially_refunded");
  assert.equal(f.order.refund_started_at, null);
  assert.deepEqual(f.calls, { provider: 1, release: 1, save: 1, stock: 1, fullStock: 0, mark: 0 });
});

test("concurrent financial claims send only one provider request", async () => {
  const f = fixture();
  const results = await Promise.allSettled([runRefundWorkflow(input, f.deps), runRefundWorkflow(input, f.deps)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(f.calls.provider, 1);
  assert.equal(f.order.refunded_amount, 25);
});

for (const failure of ["network", "malformed", "null", "http500", "unknown-status", "wrong-order", "wrong-amount", "wrong-reference"]) {
  test(`${failure} after dispatch retains the lock and blocks a second financial attempt`, async () => {
    const f = fixture();
    f.setReply(async () => {
      if (failure === "network") throw new Error("Connection lost after provider accepted refund");
      if (failure === "malformed") return new Response("not-json");
      if (failure === "null") return Response.json(null);
      if (failure === "http500") return Response.json({ status: "success" }, { status: 500 });
      return Response.json({
        status: failure === "unknown-status" ? "pending" : "success",
        merchant_oid: failure === "wrong-order" ? "OTHER" : "PRSTESTORDER",
        return_amount: failure === "wrong-amount" ? "24.00" : "25.00",
        reference_no: failure === "wrong-reference" ? "OTHER" : "PRSRETURN10",
      });
    });
    await assert.rejects(runRefundWorkflow(input, f.deps), unsafe);
    assert.ok(f.order.refund_started_at);
    await assert.rejects(runRefundWorkflow(input, f.deps), unsafe);
    assert.equal(f.calls.provider, 1);
    assert.equal(f.calls.release, 0);
    assert.equal(f.calls.save, 0);
    assert.equal(f.calls.stock, 0);
  });
}

test("provider amounts reject coercible JSON and fractional cents", async () => {
  for (const amount of [true, [25], {}, "2.5e1", "25.001", 25.001, " 25.00", "25."]) {
    const f = fixture();
    f.setReply(async () => Response.json({ status: "success", merchant_oid: "PRSTESTORDER", return_amount: amount }));
    await assert.rejects(runRefundWorkflow({ ...input, refundAmount: amount === true ? 1 : 25 }, f.deps), unsafe);
    assert.ok(f.order.refund_started_at);
    assert.equal(f.calls.save, 0);
    assert.equal(f.calls.stock, 0);
  }
});

test("provider amount accepts an exact numeric currency value", async () => {
  const f = fixture();
  f.setReply(async () => Response.json({ status: "success", merchant_oid: "PRSTESTORDER", return_amount: 25 }));
  assert.equal((await runRefundWorkflow(input, f.deps)).refundAmount, 25);
});

test("only an explicit provider rejection with a confirmed unlock is retry-safe", async () => {
  const f = fixture();
  f.setReply(async () => Response.json({ status: "error", err_no: "006" }));
  await assert.rejects(runRefundWorkflow(input, f.deps), (error: unknown) => {
    assert.ok(error instanceof RefundError);
    assert.equal(error.retrySafe, true);
    return true;
  });
  assert.equal(f.calls.release, 1);
  assert.equal(f.order.refund_started_at, null);
  assert.equal(f.calls.save, 0);
});

test("a lost unlock acknowledgement is not retry-safe", async () => {
  const f = fixture();
  f.setReply(async () => Response.json({ status: "failed" }));
  f.deps.repository.releaseClaim = async () => false;
  await assert.rejects(runRefundWorkflow(input, f.deps), unsafe);
  assert.ok(f.order.refund_started_at);
});

for (const result of ["zero-rows", "database-error"]) {
  test(`successful provider response followed by ${result} cannot claim local success`, async () => {
    const f = fixture();
    f.deps.repository.saveRefund = async () => {
      if (result === "database-error") throw new Error("Database unavailable");
      return false;
    };
    await assert.rejects(runRefundWorkflow(input, f.deps), unsafe);
    assert.ok(f.order.refund_started_at);
    assert.equal(f.calls.release, 0);
    assert.equal(f.calls.stock, 0);
  });
}

test("stock failure after refund is never safe to resend money", async () => {
  const f = fixture();
  f.deps.releaseReturnStock = async () => { throw new Error("Stock unavailable"); };
  await assert.rejects(runRefundWorkflow(input, f.deps), unsafe);
  assert.equal(f.order.refunded_amount, 25);
  assert.ok(f.order.refund_started_at);
  assert.equal(f.calls.provider, 1);
});

test("full return holds the order lock through stock release and blocks the direct-refund race", async () => {
  const f = fixture();
  f.deps.releaseReturnStock = async () => {
    f.calls.stock++;
    assert.equal(f.order.payment_status, "refunded");
    assert.ok(f.order.refund_started_at);
    await assert.rejects(runRefundWorkflow({ orderId: 1, newStatus: "İade Edildi" }, f.deps), unsafe);
    assert.equal(f.calls.fullStock, 0);
  };
  await runRefundWorkflow({ ...input, refundAmount: 100 }, f.deps);
  assert.equal(f.order.refund_started_at, null);
  assert.equal(f.calls.stock, 1);
  assert.equal(f.calls.mark, 1);
  assert.equal(f.calls.provider, 1);
});

test("an already refunded order cannot falsely complete an unrelated return request", async () => {
  const f = fixture({ payment_status: "refunded", refunded_amount: 100 });
  await assert.rejects(runRefundWorkflow(input, f.deps), unsafe);
  assert.equal(f.calls.provider, 0);
  assert.equal(f.calls.fullStock, 0);
});

test("a stale financial snapshot cannot overwrite a newer partial refund", async () => {
  const f = fixture();
  const claim = f.deps.repository.claimOrder;
  f.deps.repository.claimOrder = async (snapshot, at) => {
    f.order.refunded_amount = 50;
    f.order.payment_status = "partially_refunded";
    return claim(snapshot, at);
  };
  await assert.rejects(runRefundWorkflow(input, f.deps), unsafe);
  assert.equal(f.calls.provider, 0);
  assert.equal(f.order.refunded_amount, 50);
});

test("missing credentials and invalid amounts fail before acquiring a financial lock", async () => {
  for (const amount of [0, -1, NaN, Infinity, 101]) {
    const f = fixture();
    await assert.rejects(runRefundWorkflow({ ...input, refundAmount: amount }, f.deps));
    assert.equal(f.calls.provider, 0);
    assert.equal(f.order.refund_started_at, null);
  }
  const f = fixture();
  f.deps.credentials = {};
  await assert.rejects(runRefundWorkflow(input, f.deps));
  assert.equal(f.order.refund_started_at, null);
});

test("customer authorization and cancellation stage remain enforced", async () => {
  for (const patch of [{ customerUserId: "other-user" }, { customerUserId: "test-user" }]) {
    const f = fixture();
    await assert.rejects(runRefundWorkflow({ ...input, ...patch, newStatus: "İptal Edildi" }, f.deps));
    assert.equal(f.calls.provider, 0);
  }
});

test("full refund closes the financial balance and duplicate requests do not repay", async () => {
  const f = fixture({ status: "Hazırlanıyor" });
  const full = { orderId: 1, newStatus: "İptal Edildi" as const, customerUserId: "test-user" };
  assert.equal((await runRefundWorkflow(full, f.deps)).fullyRefunded, true);
  assert.equal((await runRefundWorkflow(full, f.deps)).alreadyRefunded, true);
  assert.equal(f.calls.provider, 1);
  assert.equal(f.order.refunded_amount, 100);
});

test("production adapter uses financial snapshot CAS and verifies affected rows", async () => {
  const source = await readFile(new URL("../lib/paytr/refundOrder.ts", import.meta.url), "utf8");
  assert.match(source, /eq\("refunded_amount", order\.refunded_amount\)/);
  assert.match(source, /eq\("total_amount", order\.total_amount\)/);
  assert.match(source, /eq\("status", order\.status\)/);
  assert.match(source, /eq\("refund_started_at", startedAt\)/);
  assert.equal((source.match(/select\("id"\)\.maybeSingle\(\)/g) || []).length, 4);
});
