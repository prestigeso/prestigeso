import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";

// Raster assets are generated from the checked-in, font-independent brand mark.
// Keep public/logo.jpeg (the full wordmark) unchanged.
const source = await readFile(new URL("../public/brand-icon.svg", import.meta.url));
const png = (size) => sharp(source).resize(size, size).png().toBuffer();
const files = [
  ["../app/icon.png", 96],
  ["../app/apple-icon.png", 180],
  ["../public/icons/icon-192.png", 192],
  ["../public/icons/icon-512.png", 512],
];

await mkdir(new URL("../public/icons/", import.meta.url), { recursive: true });
for (const [path, size] of files) {
  await writeFile(new URL(path, import.meta.url), await png(size));
}

// ICO directory entries point to embedded PNGs; include legacy and HiDPI sizes.
const sizes = [16, 32, 48, 64, 128, 256];
const frames = await Promise.all(sizes.map(png));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index] === 256 ? 0 : sizes[index];
  header[entry + 1] = header[entry];
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(
  new URL("../app/favicon.ico", import.meta.url),
  Buffer.concat([header, ...frames]),
);
console.log("Generated PrestigeSO favicon, search, Apple and Android icons.");
