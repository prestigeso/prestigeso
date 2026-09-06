import assert from "node:assert/strict";
import test from "node:test";
import {
  approveReturnWithConfirmation,
  confirmFinancialStatusChange,
  getReviewableReturnRequest,
} from "../lib/orders/returnApproval.ts";

const summary = "Sipariş TEST-123: 125,50 TL gerçek para iadesi, 1 adet stok dönüşü.";

test("approved returns remain visible and take precedence over pending entries", () => {
  const pending = { id: 1, status: "pending", reason: "Bekleyen talep" };
  const approved = { id: 2, status: "approved", reason: "Sonuç bekliyor" };
  assert.equal(getReviewableReturnRequest([pending, approved]), approved);
  assert.equal(getReviewableReturnRequest([approved]), approved);
});

test("pending return is selected without accidentally choosing completed history", () => {
  const pending = { id: 2, status: "pending" };
  assert.equal(getReviewableReturnRequest([{ id: 1, status: "completed" }, pending]), pending);
});

test("completed or missing returns cannot be presented as pending approvals", () => {
  assert.equal(getReviewableReturnRequest([{ status: "completed" }, { status: "rejected" }]), undefined);
  assert.equal(getReviewableReturnRequest(undefined), undefined);
});

for (const cancellation of ["note", "shipping", "confirmation"] as const) {
  test(`return approval makes no API decision when ${cancellation} is cancelled or dismissed with Escape`, async () => {
    const prompts: string[] = [];
    let confirmations = 0;
    let apiDecisions = 0;
    const approved = await approveReturnWithConfirmation(
      summary,
      {
        prompt: (message) => {
          prompts.push(message);
          if (prompts.length === 1 && cancellation === "note") return null;
          if (prompts.length === 2 && cancellation === "shipping") return null;
          return "";
        },
        confirm: () => {
          confirmations += 1;
          return cancellation !== "confirmation";
        },
      },
      () => { apiDecisions += 1; },
    );
    assert.equal(approved, false);
    assert.equal(apiDecisions, 0);
    assert.equal(prompts.length, cancellation === "note" ? 1 : 2);
    assert.equal(confirmations, cancellation === "confirmation" ? 1 : 0);
  });
}

test("optional empty fields still require final monetary confirmation", async () => {
  const calls: Array<{ note: string; returnShippingCode: string }> = [];
  const approved = await approveReturnWithConfirmation(
    summary,
    {
      prompt: () => "",
      confirm: (message) => { assert.equal(message, summary); return true; },
    },
    (details) => { calls.push(details); },
  );
  assert.equal(approved, true);
  assert.deepEqual(calls, [{ note: "", returnShippingCode: "" }]);
});

test("return approval trims user fields and waits for the decision request", async () => {
  const answers = ["  Kabul edildi  ", "  KARGO-123  "];
  let completed = false;
  const approved = await approveReturnWithConfirmation(
    summary,
    { prompt: () => answers.shift() ?? null, confirm: () => true },
    async (details) => {
      assert.deepEqual(details, { note: "Kabul edildi", returnShippingCode: "KARGO-123" });
      await Promise.resolve();
      completed = true;
    },
  );
  assert.equal(approved, true);
  assert.equal(completed, true);
});

test("failed decision propagates to the caller rather than claiming approval", async () => {
  await assert.rejects(
    approveReturnWithConfirmation(
      summary,
      { prompt: () => "", confirm: () => true },
      async () => { throw new Error("API decision failed"); },
    ),
    /API decision failed/,
  );
});

test("both financial status choices require explicit confirmation", () => {
  for (const status of ["İade Edildi", "İptal Edildi"]) {
    let confirmations = 0;
    assert.equal(confirmFinancialStatusChange(status, summary, (message) => {
      confirmations += 1;
      assert.equal(message, summary);
      return false;
    }), false);
    assert.equal(confirmations, 1);
    assert.equal(confirmFinancialStatusChange(status, summary, () => true), true);
  }
});

test("ordinary status changes do not show a money refund confirmation", () => {
  assert.equal(confirmFinancialStatusChange("Kargolandı", summary, () => {
    assert.fail("non-financial status must not ask to refund");
  }), true);
});
