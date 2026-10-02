/**
 * Delete only legacy Supabase product/hero objects that were copied to R2.
 * Requires the saved migration plan and SHA-256 manifest. No other bucket
 * objects (including review photos) are eligible.
 *
 * Run the migration script's --verify and --audit-switch gates first.
 * A plain invocation is a dry run; --delete removes the exact verified set.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';

const deleting = process.argv.includes('--delete');
if (process.argv.slice(2).some((argument) => argument !== '--delete')) {
  throw new Error('Only --delete is supported. Omit it for a dry run.');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicBase = process.env.R2_PUBLIC_BASE_URL;
if (!supabaseUrl || !serviceKey || publicBase !== 'https://media.prestigeso.com.tr') {
  throw new Error('Expected Supabase project credentials and production R2 public domain.');
}
const sourceOrigin = new URL(supabaseUrl).origin;
const sourcePrefix = `${sourceOrigin}/storage/v1/object/public/products/`;
const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const storage = db.storage.from('products');
const outputDir = path.resolve('output', 'r2-product-media');
const plan = JSON.parse(await fs.readFile(path.join(outputDir, 'plan.json'), 'utf8'));
if (plan.sourceOrigin !== sourceOrigin || !Array.isArray(plan.products) || !Array.isArray(plan.slides)) {
  throw new Error('Migration plan belongs to a different project or is invalid.');
}

function sourceKey(value) {
  if (typeof value !== 'string' || !value.startsWith(sourcePrefix)) return null;
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash) throw new Error('Unexpected source URL.');
  const key = decodeURIComponent(url.pathname.slice('/storage/v1/object/public/products/'.length));
  if (!key || key.split('/').some((part) => !part || part === '.' || part === '..' || part.includes('\\'))) {
    throw new Error('Unsafe source object key.');
  }
  return key;
}

const plannedKeys = new Set();
for (const row of plan.products) {
  for (const value of [row.image, ...(Array.isArray(row.images) ? row.images : [])]) {
    const key = sourceKey(value);
    if (key) plannedKeys.add(key);
  }
}
for (const row of plan.slides) {
  const key = sourceKey(row.image_url);
  if (key) plannedKeys.add(key);
}
const entries = (await fs.readFile(path.join(outputDir, 'verified.jsonl'), 'utf8'))
  .trim().split('\n').map((line) => JSON.parse(line));
const manifest = new Map();
for (const entry of entries) {
  const expectedUrl = `${publicBase}/${entry.key.split('/').map(encodeURIComponent).join('/')}`;
  if (!plannedKeys.has(entry.key) || manifest.has(entry.key) || entry.url !== expectedUrl ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes <= 0) {
    throw new Error('Migration manifest does not exactly match the planned R2 objects.');
  }
  manifest.set(entry.key, entry);
}
if (manifest.size !== plannedKeys.size || manifest.size === 0) {
  throw new Error('Migration manifest is incomplete.');
}

async function rows(table, columns) {
  const result = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from(table).select(columns).range(offset, offset + 499);
    if (error) throw new Error(`${table} read failed: ${error.code}`);
    result.push(...(data || []));
    if (!data || data.length < 500) return result;
  }
}

function target(value) {
  const key = sourceKey(value);
  return key ? manifest.get(key)?.url : value;
}
const products = await rows('products', 'id,image,images');
const slides = await rows('hero_slides', 'id,image_url');
if (products.length !== plan.products.length || slides.length !== plan.slides.length) {
  throw new Error('Product or slide count changed after the migration plan.');
}
const productById = new Map(products.map((row) => [row.id, row]));
const slideById = new Map(slides.map((row) => [row.id, row]));
for (const original of plan.products) {
  const current = productById.get(original.id);
  const desired = [target(original.image), Array.isArray(original.images)
    ? original.images.map(target) : original.images];
  if (!current || JSON.stringify([current.image, current.images]) !== JSON.stringify(desired)) {
    throw new Error(`Product ${original.id} no longer matches the R2 migration target.`);
  }
}
for (const original of plan.slides) {
  if (slideById.get(original.id)?.image_url !== target(original.image_url)) {
    throw new Error(`Slide ${original.id} no longer matches the R2 migration target.`);
  }
}

// Check every public table declared by migrations. Missing, unapplied tables
// are skipped; any other read failure or old product-bucket URL blocks deletion.
const migrationDir = path.resolve('supabase', 'migrations');
const tableNames = new Set(['products', 'hero_slides']);
for (const file of await fs.readdir(migrationDir)) {
  if (!file.endsWith('.sql')) continue;
  const sql = await fs.readFile(path.join(migrationDir, file), 'utf8');
  for (const match of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_][a-z0-9_]*)/gi)) {
    tableNames.add(match[1]);
  }
}
let scannedRows = 0;
for (const table of tableNames) {
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await db.from(table).select('*').range(offset, offset + 499);
    if (error?.code === 'PGRST205') break; // Table migration not applied.
    if (error) throw new Error(`${table} reference scan failed: ${error.code}`);
    for (const row of data || []) {
      scannedRows++;
      if (JSON.stringify(row).includes(sourcePrefix)) {
        throw new Error(`Legacy Supabase media URL is still referenced in ${table}.`);
      }
    }
    if (!data || data.length < 500) break;
  }
}

async function inventory() {
  const files = new Map();
  const folders = [''];
  while (folders.length) {
    const prefix = folders.pop();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await storage.list(prefix, { limit: 1000, offset });
      if (error) throw new Error(`Storage inventory failed: ${error.message}`);
      for (const item of data || []) {
        const key = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id) files.set(key, Number(item.metadata?.size));
        else folders.push(key);
      }
      if (!data || data.length < 1000) break;
    }
  }
  return files;
}

const before = await inventory();
const present = [...plannedKeys].filter((key) => before.has(key)).sort();
for (const key of present) {
  if (before.get(key) !== manifest.get(key).bytes) {
    throw new Error(`Source object size changed after R2 verification: ${key}`);
  }
}
const bytes = present.reduce((sum, key) => sum + manifest.get(key).bytes, 0);
console.log(JSON.stringify({ mode: deleting ? 'DELETE_PREFLIGHT' : 'DRY_RUN',
  verifiedCopies: manifest.size, scannedRows, sourceObjectsPresent: present.length,
  bytesEligible: bytes, otherBucketObjects: before.size - present.length }));
if (!deleting) process.exit(0);

// Only manifest keys are passed to remove. The other bucket objects are never
// selected, and a final inventory confirms they are unchanged.
for (let offset = 0; offset < present.length; offset += 50) {
  const batch = present.slice(offset, offset + 50);
  const { data, error } = await storage.remove(batch);
  if (error) throw new Error(`Deletion stopped after ${offset} requests: ${error.message}`);
  if (!Array.isArray(data) || data.length !== batch.length) {
    throw new Error(`Deletion response mismatch after ${offset} requests.`);
  }
  console.log(JSON.stringify({ removed: Math.min(offset + batch.length, present.length),
    total: present.length }));
}
const after = await inventory();
if ([...plannedKeys].some((key) => after.has(key))) {
  throw new Error('Some migrated source objects remain after deletion.');
}
const otherBefore = [...before.keys()].filter((key) => !plannedKeys.has(key)).sort();
const otherAfter = [...after.keys()].sort();
if (JSON.stringify(otherBefore) !== JSON.stringify(otherAfter)) {
  throw new Error('Unrelated bucket objects changed during deletion.');
}
console.log(JSON.stringify({ mode: 'DELETE_COMPLETE', deleted: present.length,
  deletedBytes: bytes, untouchedObjects: otherAfter.length }));
