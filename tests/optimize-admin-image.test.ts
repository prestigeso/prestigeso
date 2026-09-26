import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { optimizeAdminImage } from "../lib/uploads/optimizeAdminImage.ts";

test("large admin PNG becomes a smaller, correctly labelled WebP", async () => {
  const pixels = Buffer.alloc(2400 * 1800 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = (index / 4) % 251;
    pixels[index + 1] = (index / 7) % 239;
    pixels[index + 2] = (index / 11) % 229;
    pixels[index + 3] = 255;
  }
  const source = await sharp(pixels, {
    raw: { width: 2400, height: 1800, channels: 4 },
  })
    .png()
    .toBuffer();
  const result = await optimizeAdminImage(source, "image/png", "product");
  assert.equal(result.contentType, "image/webp");
  assert.equal(result.extension, "webp");
  assert.ok(result.body.length < source.length);
  const metadata = await sharp(result.body).metadata();
  assert.equal(metadata.width, 1800);
  assert.equal(metadata.format, "webp");
});

test("small images are not enlarged", async () => {
  const source = await sharp({
    create: { width: 320, height: 240, channels: 4, background: "#32aabb" },
  })
    .png()
    .toBuffer();
  const result = await optimizeAdminImage(source, "image/png", "hero");
  assert.ok(result.body.length <= source.length);
  const metadata = await sharp(result.body).metadata();
  assert.equal(metadata.width, 320);
  assert.equal(metadata.height, 240);
});
