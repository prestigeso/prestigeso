import { test } from "node:test";
import assert from "node:assert/strict";
import { createLatestRequest } from "../lib/checkout/latestRequest.ts";

test("district B invalidates district A even if its transport ignores abort", async () => {
  const requests = createLatestRequest();
  const first = requests.start();
  const second = requests.start();
  assert.equal(first.signal.aborted, true);
  assert.equal(first.isCurrent(), false);
  assert.equal(second.isCurrent(), true);
  const values: string[] = [];
  await Promise.resolve().then(() => { if (second.isCurrent()) values.push("B"); });
  await Promise.resolve().then(() => { if (first.isCurrent()) values.push("A"); });
  assert.deepEqual(values, ["B"]);
});
test("city reset and component disposal invalidate every in-flight neighborhood response", () => {
  const requests = createLatestRequest();
  const request = requests.start();
  requests.cancel();
  requests.cancel();
  assert.equal(request.signal.aborted, true);
  assert.equal(request.isCurrent(), false);
  const next = requests.start();
  assert.equal(next.isCurrent(), true);
  assert.equal(next.signal.aborted, false);
});
