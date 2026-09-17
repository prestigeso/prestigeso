import test from "node:test";
import assert from "node:assert/strict";
import { createConsentBoundTask } from "../lib/legal/consentTask.ts";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
test("missing/denied consent sends nothing; acceptance sends once; duplicate events do not resend", async () => {
  let allowed = false;
  let calls = 0;
  const task = createConsentBoundTask({
    allowed: () => allowed,
    run: async () => {
      calls++;
    },
  });
  task.sync();
  task.sync();
  assert.equal(calls, 0);
  allowed = true;
  task.sync();
  task.sync();
  await flush();
  task.sync();
  assert.equal(calls, 1);
  task.dispose();
});
test("revocation aborts pending work and does not create an automatic retry", async () => {
  let allowed = true;
  let calls = 0;
  let aborts = 0;
  let purges = 0;
  const task = createConsentBoundTask({
    allowed: () => allowed,
    onRevoke: () => {
      purges++;
    },
    run: async (signal) => {
      calls++;
      await new Promise<void>((resolve) =>
        signal.addEventListener("abort", () => {
          aborts++;
          resolve();
        }),
      );
    },
  });
  task.sync();
  allowed = false;
  task.sync();
  await flush();
  task.sync();
  assert.equal(calls, 1);
  assert.equal(aborts, 1);
  assert.equal(purges, 2);
  task.dispose();
});
test("unmount aborts telemetry and later preference events cannot start it", () => {
  let calls = 0;
  let signal: AbortSignal | undefined;
  const task = createConsentBoundTask({
    allowed: () => true,
    run: async (next) => {
      calls++;
      signal = next;
    },
  });
  task.sync();
  task.dispose();
  task.sync();
  assert.equal(calls, 1);
  assert.equal(signal?.aborted, true);
});
