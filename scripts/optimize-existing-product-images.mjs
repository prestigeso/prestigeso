/**
 * Preserve every Storage path/URL while reducing existing product image bytes.
 * Defaults to a read-only sample. --apply requires an explicit local backup.
 * Usage: node --env-file=.env.local scripts/optimize-existing-product-images.mjs [--apply] [--limit=N]
 */
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const apply = process.argv.includes('--apply');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.slice(8)) : apply ? Infinity : 30;
if (!(limit === Infinity || (Number.isSafeInteger(limit) && limit > 0))) {
  throw new Error('Invalid --limit value');
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase environment missing');
const storage = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
}).storage.from('products');

const backupRoot = path.resolve('output', 'storage-image-backup-2026-09-25');
const manifest = path.join(backupRoot, 'manifest.jsonl');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const suffixMime = {
  jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif',
};

async function listObjects(prefix = '') {
  const result = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await storage.list(prefix, {
      limit: 100, offset, sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    for (const entry of data || []) {
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) result.push({ key, bytes: Number(entry.metadata?.size || 0), mime: entry.metadata?.mimetype || '' });
      else result.push(...await listObjects(key));
    }
    if ((data || []).length < 100) break;
  }
  return result;
}

function safeBackupPath(objectKey) {
  const segments = objectKey.split('/');
  if (segments.some((part) => !part || part === '.' || part === '..' || part.includes('\\'))) {
    throw new Error('Unsafe object path');
  }
  const target = path.resolve(backupRoot, 'originals', ...segments);
  if (!target.startsWith(path.join(backupRoot, 'originals') + path.sep)) {
    throw new Error('Unsafe backup target');
  }
  return target;
}

async function download(objectKey) {
  const { data, error } = await storage.download(objectKey);
  if (error) throw error;
  return Buffer.from(await data.arrayBuffer());
}

async function verify(objectKey, expected) {
  const asset = new URL(`/storage/v1/object/public/products/${objectKey.split('/').map(encodeURIComponent).join('/')}`, url);
  asset.searchParams.set('cacheNonce', crypto.randomUUID());
  const response = await fetch(asset, {
    headers: { Authorization: `Bearer ${key}`, apikey: key, 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Verification HTTP ${response.status}`);
  if (!(response.headers.get('content-type') || '').startsWith('image/webp')) {
    throw new Error('Verification content type mismatch');
  }
  const actual = Buffer.from(await response.arrayBuffer());
  if (sha256(actual) !== sha256(expected)) throw new Error('Verification hash mismatch');
}

const all = (await listObjects()).filter(({ key }) => /\.(png|jpe?g|webp|avif)$/i.test(key));
const selected = all.filter(({ mime }) => mime !== 'image/webp').sort((a, b) => b.bytes - a.bytes).slice(0, limit);
console.log(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY_RUN', allImages: all.length, totalMiB: +(all.reduce((sum, item) => sum + item.bytes, 0) / 1048576).toFixed(2), selected: selected.length, selectedMiB: +(selected.reduce((sum, item) => sum + item.bytes, 0) / 1048576).toFixed(2) }));
if (apply) await fs.mkdir(backupRoot, { recursive: true });

let saved = 0;
let updated = 0;
let skipped = 0;
for (let index = 0; index < selected.length; index++) {
  const { key: objectKey } = selected[index];
  const original = await download(objectKey);
  const image = sharp(original, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  const originalMime = suffixMime[metadata.format];
  if (!originalMime || metadata.pages > 1) { skipped++; continue; }
  const maxWidth = objectKey.includes('hero') ? 2400 : 1800;
  const optimized = await sharp(original, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  if (optimized.length >= original.length * 0.85 || original.length - optimized.length < 64 * 1024) {
    skipped++;
    continue;
  }
  const difference = original.length - optimized.length;
  if (!apply) {
    saved += difference;
    updated++;
  } else {
    const backup = safeBackupPath(objectKey);
    await fs.mkdir(path.dirname(backup), { recursive: true });
    try {
      await fs.writeFile(backup, original, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST' || sha256(await fs.readFile(backup)) !== sha256(original)) throw error;
    }
    const preview = path.resolve(backupRoot, 'optimized', `${sha256(objectKey)}.webp`);
    await fs.mkdir(path.dirname(preview), { recursive: true });
    try {
      await fs.writeFile(preview, optimized, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST' || sha256(await fs.readFile(preview)) !== sha256(optimized)) throw error;
    }
    await fs.appendFile(manifest, JSON.stringify({ status: 'backed_up', key: objectKey, originalBytes: original.length, optimizedBytes: optimized.length, originalMime, sha256: sha256(original) }) + '\n');
    const { error } = await storage.update(objectKey, optimized, {
      contentType: 'image/webp', cacheControl: '3600',
    });
    if (error) throw error;
    try {
      await verify(objectKey, optimized);
    } catch (verificationError) {
      const restore = await storage.update(objectKey, original, {
        contentType: originalMime, cacheControl: '3600',
      });
      await fs.appendFile(manifest, JSON.stringify({ status: 'verification_failed', key: objectKey, restored: !restore.error }) + '\n');
      throw verificationError;
    }
    await fs.appendFile(manifest, JSON.stringify({ status: 'verified', key: objectKey, savedBytes: difference }) + '\n');
    saved += difference;
    updated++;
  }
  if ((index + 1) % 10 === 0) {
    console.log(JSON.stringify({ processed: index + 1, updated, skipped, savedMiB: +(saved / 1048576).toFixed(2) }));
  }
}
console.log(JSON.stringify({ complete: true, mode: apply ? 'APPLY' : 'DRY_RUN', updated, skipped, savedMiB: +(saved / 1048576).toFixed(2), backupDirectory: apply ? backupRoot : null }));
