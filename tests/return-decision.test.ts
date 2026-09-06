import assert from "node:assert/strict";
import test from "node:test";
import {
  ReturnDecisionError,
  runReturnDecision,
  type ReturnDecisionMutation,
} from "../lib/returns/returnDecision.ts";
import { calculateReturnRefundAmount } from "../lib/returns/refundAmount.ts";

const changed = (): ReturnDecisionMutation => ({ data: { id: 7 }, error: null });
const unchanged = (): ReturnDecisionMutation => ({ data: null, error: null });
const failed = (): ReturnDecisionMutation => ({ data: null, error: { message: "DB unavailable" } });

test("concurrent approvals and a later replay perform only one partial refund", async () => {
  let status = "pending";
  let refundCalls = 0;
  const approve = () => runReturnDecision({
    claim: async () => {
      if (status !== "pending") return unchanged();
      status = "approved";
      return changed();
    },
    perform: async () => {
      refundCalls++;
      await Promise.resolve();
      return { status: "Kısmi İade", amount: 50 };
    },
    complete: async () => {
      status = "completed";
      return changed();
    },
    canRetry: () => false,
  });
  const results = await Promise.allSettled([approve(), approve()]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const loser = results.find((result) => result.status === "rejected");
  assert.ok(loser?.status === "rejected" && loser.reason instanceof ReturnDecisionError);
  assert.equal(loser.reason.status, 409);
  await assert.rejects(approve(), { status: 409 });
  assert.equal(refundCalls, 1);
  assert.equal(status, "completed");
});

for (const winner of ["approve", "reject"] as const) {
  test(`${winner} winner prevents competing decision from refunding or restoring order state`, async () => {
    let status = "pending";
    const performed: string[] = [];
    const decide = (decision: string) => runReturnDecision({
      claim: async () => {
        if (status !== "pending") return unchanged();
        status = decision;
        return changed();
      },
      perform: async () => { performed.push(decision); },
      canRetry: () => false,
    });
    const loser = winner === "approve" ? "reject" : "approve";
    await Promise.allSettled([decide(winner), decide(loser)]);
    assert.deepEqual(performed, [winner]);
    assert.equal(status, winner);
  });
}

for (const [name, mutation] of [["zero rows", unchanged], ["database error", failed]] as const) {
  test(`claim ${name} never invokes refund, reset or completion`, async () => {
    const calls: string[] = [];
    await assert.rejects(runReturnDecision({
      claim: async () => mutation(),
      perform: async () => { calls.push("refund"); },
      complete: async () => { calls.push("complete"); return changed(); },
      reset: async () => { calls.push("reset"); return changed(); },
      canRetry: () => true,
    }), ReturnDecisionError);
    assert.deepEqual(calls, []);
  });
}

test("an explicitly safe refund failure can reset the owned request and remains an error", async () => {
  const providerError = new Error("Confirmed rejection");
  let resets = 0;
  let completions = 0;
  await assert.rejects(runReturnDecision({
    claim: async () => changed(),
    perform: async () => { throw providerError; },
    reset: async () => { resets++; return changed(); },
    complete: async () => { completions++; return changed(); },
    canRetry: (error) => error === providerError,
  }), (error) => error === providerError);
  assert.equal(resets, 1);
  assert.equal(completions, 0);
});

test("an unknown refund failure stays approved even without a special error message", async () => {
  const failure = new Error("network disconnected");
  let resets = 0;
  await assert.rejects(runReturnDecision({
    claim: async () => changed(),
    perform: async () => { throw failure; },
    reset: async () => { resets++; return changed(); },
    canRetry: () => false,
  }), (error) => error === failure);
  assert.equal(resets, 0);
});

for (const [name, mutate] of [
  ["zero rows", async () => unchanged()],
  ["database error", async () => failed()],
  ["transport error", async () => { throw new Error("network disconnected"); }],
] as const) {
  test(`safe-failure reset ${name} requires manual reconciliation`, async () => {
    await assert.rejects(runReturnDecision({
      claim: async () => changed(),
      perform: async () => { throw new Error("provider rejected"); },
      reset: mutate,
      canRetry: () => true,
    }), (error) => error instanceof ReturnDecisionError && error.status === 500 && /Manuel mutabakat/.test(error.message));
  });

  test(`completion ${name} never resets a request after successful payment`, async () => {
    let resets = 0;
    await assert.rejects(runReturnDecision({
      claim: async () => changed(),
      perform: async () => ({ status: "Kısmi İade" }),
      complete: mutate,
      reset: async () => { resets++; return changed(); },
      canRetry: () => true,
    }), (error) => error instanceof ReturnDecisionError && error.status === 500 && /Manuel mutabakat/.test(error.message));
    assert.equal(resets, 0);
  });
}

const orderItems = [
  { id: 1, variant_id: 5, quantity: 2, price: "100.00" },
  { id: 2, quantity: 1, price: 50 },
];

test("return amount keeps paid-total allocation and ignores prices supplied in the return request", () => {
  assert.equal(calculateReturnRefundAmount({
    orderItems,
    returnItems: [{ id: 1, variant_id: 5, quantity: 1, price: 1000000 }],
    totalAmount: "225.00",
  }), 90);
  assert.equal(calculateReturnRefundAmount({ orderItems, returnItems: orderItems, totalAmount: 225 }), 225);
  assert.equal(calculateReturnRefundAmount({ orderItems: JSON.stringify(orderItems), returnItems: JSON.stringify(orderItems), totalAmount: 225 }), 225);
});

test("different variants are distinct while duplicate, unknown or excessive return rows are rejected", () => {
  for (const returnItems of [
    [{ id: 1, variant_id: 5, quantity: 1 }, { id: 1, variant_id: 5, quantity: 1 }],
    [{ id: 1, variant_id: 5, quantity: 3 }],
    [{ id: 1, quantity: 1 }],
    [{ id: 3, quantity: 1 }],
  ]) assert.throws(() => calculateReturnRefundAmount({ orderItems, returnItems, totalAmount: 225 }));

  const variants = [
    { id: 1, variant_id: 5, quantity: 1, price: 100 },
    { id: 1, variant_id: 6, quantity: 1, price: 200 },
  ];
  assert.equal(calculateReturnRefundAmount({ orderItems: variants, returnItems: [variants[1]], totalAmount: 300 }), 200);
});

test("invalid identities, quantities, amounts and saved order prices fail closed", () => {
  for (const value of [0, -1, 0.5, true, null, "", Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => calculateReturnRefundAmount({ orderItems, returnItems: [{ id: 2, quantity: value }], totalAmount: 225 }));
  }
  for (const value of [-1, true, null, "", Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => calculateReturnRefundAmount({ orderItems, returnItems: orderItems, totalAmount: value }));
  }
  assert.throws(() => calculateReturnRefundAmount({ orderItems: [...orderItems, orderItems[0]], returnItems: orderItems, totalAmount: 225 }));
  assert.throws(() => calculateReturnRefundAmount({ orderItems: [{ id: 2, quantity: 1, price: -50 }], returnItems: [{ id: 2, quantity: 1 }], totalAmount: 50 }));
  assert.throws(() => calculateReturnRefundAmount({ orderItems, returnItems: [{ id: true, quantity: 1 }], totalAmount: 225 }));
});
