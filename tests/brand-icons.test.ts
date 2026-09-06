import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(path, import.meta.url));
function assertPngSize(bytes: Buffer, size: number) {
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16), size);
  assert.equal(bytes.readUInt32BE(20), size);
}

test("brand manifest is linked and exposes correctly sized mobile icons", async () => {
  const layout = (await read("../app/layout.tsx")).toString("utf8");
  assert.match(layout, /manifest:\s*"\/manifest\.json"/);
  const manifest = JSON.parse((await read("../public/manifest.json")).toString("utf8"));
  assert.equal(manifest.name, "PrestigeSO");
  assert.equal(manifest.short_name, "PrestigeSO");
  assert.equal(manifest.icons.length, 2);
  for (const icon of manifest.icons) {
    const size = Number(icon.sizes.split("x")[0]);
    assert.equal(icon.type, "image/png");
    assertPngSize(await read(`../public${icon.src}`), size);
  }
});

test("Next metadata icon files provide square search and Apple icons", async () => {
  assertPngSize(await read("../app/icon.png"), 96);
  assertPngSize(await read("../app/apple-icon.png"), 180);
});

test("favicon contains the current brand artwork at every declared resolution", async () => {
  const sharp = (await import("sharp")).default;
  const mark = await read("../public/brand-icon.svg");
  const ico = await read("../app/favicon.ico");
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  const sizes = [16, 32, 48, 64, 128, 256];
  assert.equal(ico.readUInt16LE(4), sizes.length);
  for (const [index, size] of sizes.entries()) {
    const entry = 6 + index * 16;
    assert.equal(ico[entry] || 256, size);
    assert.equal(ico[entry + 1] || 256, size);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset >= 6 + sizes.length * 16 && offset + length <= ico.length);
    const frame = ico.subarray(offset, offset + length);
    assertPngSize(frame, size);
    const expected = await sharp(mark).resize(size, size).raw().toBuffer();
    const actual = await sharp(frame).raw().toBuffer();
    assert.deepEqual(actual, expected);
  }
});
