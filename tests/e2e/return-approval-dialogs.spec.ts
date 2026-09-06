import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import ts from "typescript";

// Isolated browser harness: production approval workflow, native browser dialogs,
// fake decision callback. No login, server route, or live financial request.
test.beforeEach(async ({ page }) => {
  const source = await readFile("lib/orders/returnApproval.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText;
  await page.setContent('<button id="approve">İadeyi onayla</button><output id="result">waiting</output><output id="calls">0</output>');
  await page.addScriptTag({ content: `
    window.approvalWorkflow = (() => {
      const exports = {};
      ${compiled}
      return exports;
    })();
    document.querySelector('#approve').addEventListener('click', async () => {
      const result = await window.approvalWorkflow.approveReturnWithConfirmation(
        'Sipariş TEST-123\\nİade tutarı: 125,50 TL\\n1 adet ürün stoklara geri eklenecektir.',
        { prompt: (message) => window.prompt(message), confirm: (message) => window.confirm(message) },
        () => {
          const calls = document.querySelector('#calls');
          calls.textContent = String(Number(calls.textContent) + 1);
        }
      );
      document.querySelector('#result').textContent = result ? 'approved' : 'cancelled';
    });
  ` });
});

for (const cancelAt of [1, 2, 3]) {
  test(`return approval native dialog ${cancelAt} cancel does not submit a decision`, async ({ page }) => {
    let dialogCount = 0;
    page.on("dialog", async (dialog) => {
      dialogCount += 1;
      if (dialogCount === cancelAt) await dialog.dismiss();
      else await dialog.accept("");
    });
    await page.getByRole("button", { name: "İadeyi onayla" }).click();
    await expect(page.locator("#result")).toHaveText("cancelled");
    await expect(page.locator("#calls")).toHaveText("0");
    expect(dialogCount).toBe(cancelAt);
  });
}

test("return approval submits once only after the monetary confirmation", async ({ page }) => {
  const messages: string[] = [];
  page.on("dialog", async (dialog) => {
    messages.push(dialog.message());
    await dialog.accept("");
  });
  await page.getByRole("button", { name: "İadeyi onayla" }).click();
  await expect(page.locator("#result")).toHaveText("approved");
  await expect(page.locator("#calls")).toHaveText("1");
  expect(messages).toHaveLength(3);
  expect(messages[2]).toContain("125,50 TL");
  expect(messages[2]).toContain("stoklara geri");
});
