import assert from "node:assert/strict";
import test from "node:test";
import {
  createPaytrCallbackHash,
  createPaytrRefundToken,
  verifyPaytrCallbackHash,
} from "../lib/paytr/signatures.ts";

test("PayTR callback hash accepts the authentic payload and rejects tampering", () => {
  const hash = createPaytrCallbackHash({
    merchantOid: "order-42",
    merchantSalt: "salt",
    status: "success",
    totalAmount: "12990",
    merchantKey: "secret-key",
  });

  assert.equal(verifyPaytrCallbackHash(hash, hash), true);
  assert.equal(verifyPaytrCallbackHash(hash, `${hash.slice(0, -1)}x`), false);
  assert.equal(verifyPaytrCallbackHash(hash, "short"), false);
});

test("PayTR refund token binds order and refund amount", () => {
  const base = {
    merchantId: "merchant",
    merchantOid: "order-42",
    returnAmount: "129.90",
    merchantSalt: "salt",
    merchantKey: "secret-key",
  };
  const token = createPaytrRefundToken(base);

  assert.equal(token, createPaytrRefundToken(base));
  assert.notEqual(
    token,
    createPaytrRefundToken({ ...base, returnAmount: "120.00" }),
  );
});
