/**
 * Copy public product and hero images to R2 without deleting Supabase objects.
 *
 * 1. node --env-file=.env.local scripts/migrate-product-media-to-r2.mjs --save-plan
 * 2. Configure R2, then rerun with --copy. Copies are SHA-256 verified.
 * 3. After the custom domain serves every copy, rerun with --switch-db.
 *
 * Both write modes use the saved snapshot in output/r2-product-media/.
 * --switch-db and --rollback-db use optimistic checks; concurrent image edits
 * stop the cutover or rollback instead of overwriting them.
 */
import { createClient } from '@supabase/supabase-js';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { validateR2Environment } from './lib/r2-environment.mjs';

const copy = process.argv.includes('--copy');
const switchDb = process.argv.includes('--switch-db');
const rollbackDb = process.argv.includes('--rollback-db');
const verify = process.argv.includes('--verify');
if ([copy, switchDb, rollbackDb, verify].filter(Boolean).length > 1) {
  throw new Error('Run one write mode at a time.');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error('Supabase environment is missing.');
const db = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const sourceOrigin = new URL(supabaseUrl).origin;
const sourcePrefix = '/storage/v1/object/public/products/';
const outputDir = path.resolve('output', 'r2-product-media');
const planFile = path.join(outputDir, 'plan.json');
const manifestFile = path.join(outputDir, 'verified.jsonl');
const sha256 = (body) => crypto.createHash('sha256').update(body).digest('hex');

function sourceKey(value) {
  if (typeof value !== 'string') return null;
  try {
    if (/%(?:2e|2f|5c)/i.test(value)) return null;
    const url = new URL(value);
    if (url.origin !== sourceOrigin || url.username || url.password || url.search || url.hash || !url.pathname.startsWith(sourcePrefix)) return null;
    const key = decodeURIComponent(url.pathname.slice(sourcePrefix.length));
    if (key.split('/').some((part) => !part || part === '.' || part === '..' || part.includes('\\'))) return null;
    return key;
  } catch {
    return null;
  }
}

function r2Settings() {
  const issues = validateR2Environment({ ...process.env, PRODUCT_MEDIA_BACKEND: 'r2' });
  if (issues.length) throw new Error(`Missing or invalid R2 settings: ${issues.join(', ')}`);
  const account = process.env.R2_ACCOUNT_ID?.trim() || '';
  const bucket = process.env.R2_BUCKET?.trim() || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || '';
  const rawBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim() || '';
  if (!/^[a-f0-9]{32}$/i.test(account) || !bucket || !accessKeyId || !secretAccessKey || !rawBaseUrl) {
    throw new Error('R2 account, bucket, keys and public custom domain are required.');
  }
  const baseUrl = new URL(rawBaseUrl);
  if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password || baseUrl.port || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash || baseUrl.hostname.endsWith('.r2.dev') || baseUrl.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error('R2_PUBLIC_BASE_URL must be an HTTPS origin.');
  }
  return { account, bucket, accessKeyId, secretAccessKey, baseUrl };
}

function r2Url(settings, key) {
  return new URL(key.split('/').map(encodeURIComponent).join('/'), settings.baseUrl).toString();
}

function r2Client(settings) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${settings.account}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
  });
}

function imageContentType(blobType, key) {
  if (blobType?.startsWith('image/')) return blobType;
  const extension = key.split('.').pop()?.toLowerCase();
  return {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
  }[extension] || 'application/octet-stream';
}

async function allRows(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await db.from(table).select(columns).order('id').range(from, from + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

function mediaKeys(plan) {
  const keys = new Set();
  for (const product of plan.products) {
    for (const value of [product.image, ...(Array.isArray(product.images) ? product.images : [])]) {
      const key = sourceKey(value);
      if (key) keys.add(key);
    }
  }
  for (const slide of plan.slides) {
    const key = sourceKey(slide.image_url);
    if (key) keys.add(key);
  }
  return [...keys].sort();
}

async function readPlan() {
  const plan = JSON.parse(await fs.readFile(planFile, 'utf8'));
  if (plan.sourceOrigin !== sourceOrigin || !Array.isArray(plan.products) || !Array.isArray(plan.slides)) {
    throw new Error('Saved plan does not match this Supabase project.');
  }
  return plan;
}

async function verifiedEntries() {
  const result = new Map();
  const lines = (await fs.readFile(manifestFile, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  })).trim();
  for (const line of lines ? lines.split('\n') : []) {
    const entry = JSON.parse(line);
    result.set(entry.key, entry);
  }
  return result;
}

async function r2Body(s3, settings, key) {
  const result = await s3.send(new GetObjectCommand({ Bucket: settings.bucket, Key: key }));
  if (!result.Body) throw new Error(`R2 returned no body for ${key}`);
  return Buffer.from(await result.Body.transformToByteArray());
}

async function copyObjects(plan, settings) {
  const s3 = r2Client(settings);
  const storage = db.storage.from('products');
  const done = await verifiedEntries();
  try {
    for (const key of mediaKeys(plan)) {
      if (done.has(key)) continue;
      const { data, error } = await storage.download(key);
      if (error || !data) throw error || new Error(`Supabase object missing: ${key}`);
      const body = Buffer.from(await data.arrayBuffer());
      const hash = sha256(body);
      let exists = false;
      try {
        await s3.send(new HeadObjectCommand({ Bucket: settings.bucket, Key: key }));
        exists = true;
      } catch (error) {
        if (error?.$metadata?.httpStatusCode !== 404) throw error;
      }
      if (!exists) {
        await s3.send(new PutObjectCommand({
          Bucket: settings.bucket,
          Key: key,
          Body: body,
          ContentType: imageContentType(data.type, key),
          CacheControl: 'public, max-age=31536000, immutable',
          IfNoneMatch: '*',
        }));
      }
      if (sha256(await r2Body(s3, settings, key)) !== hash) {
        throw new Error(`R2 checksum differs; stopped at ${key}`);
      }
      const entry = { key, sha256: hash, bytes: body.length, url: r2Url(settings, key) };
      await fs.appendFile(manifestFile, JSON.stringify(entry) + '\n');
      done.set(key, entry);
    }
  } finally {
    s3.destroy();
  }
  console.log(JSON.stringify({ copiedAndVerified: done.size, referencedObjects: mediaKeys(plan).length }));
}

async function checkPublicCopies(plan, settings) {
  const verified = await verifiedEntries();
  const s3 = r2Client(settings);
  try {
    for (const key of mediaKeys(plan)) {
      const entry = verified.get(key);
      if (!entry || entry.url !== r2Url(settings, key)) throw new Error(`Unverified R2 object: ${key}`);
      if (sha256(await r2Body(s3, settings, key)) !== entry.sha256) {
        throw new Error(`R2 object changed after verification: ${key}`);
      }
      const response = await fetch(entry.url, { redirect: 'error', signal: AbortSignal.timeout(30000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
        throw new Error(`Public R2 URL is not ready: ${key} (${response.status})`);
      }
      const publicBody = Buffer.from(await response.arrayBuffer());
      if (publicBody.length !== entry.bytes || sha256(publicBody) !== entry.sha256) {
        throw new Error(`Public R2 image checksum differs: ${key}`);
      }
    }
  } finally {
    s3.destroy();
  }
}

function replaced(value, settings) {
  const key = sourceKey(value);
  return key ? r2Url(settings, key) : value;
}

async function switchReferences(plan, settings) {
  const current = {
    products: await allRows('products', 'id,image,images,updated_at'),
    slides: await allRows('hero_slides', 'id,image_url'),
  };
  const plannedKeys = new Set(mediaKeys(plan));
  const newKeys = mediaKeys(current).filter((key) => !plannedKeys.has(key));
  if (newKeys.length > 0) {
    throw new Error(`${newKeys.length} new Supabase images appeared after planning; create a new plan.`);
  }
  await checkPublicCopies(plan, settings);
  let updatedProducts = 0;
  let updatedSlides = 0;
  for (const original of plan.products) {
    const desired = {
      image: replaced(original.image, settings),
      images: Array.isArray(original.images)
        ? original.images.map((value) => replaced(value, settings))
        : original.images,
    };
    if (JSON.stringify([desired.image, desired.images]) === JSON.stringify([original.image, original.images])) continue;
    const { data: current, error: readError } = await db.from('products')
      .select('image,images,updated_at').eq('id', original.id).single();
    if (readError) throw readError;
    if (JSON.stringify([current.image, current.images]) === JSON.stringify([desired.image, desired.images])) continue;
    if (JSON.stringify([current.image, current.images, current.updated_at]) !==
        JSON.stringify([original.image, original.images, original.updated_at])) {
      throw new Error(`Product ${original.id} changed after the plan; stopped without overwriting it.`);
    }
    const { data, error } = await db.from('products').update(desired)
      .eq('id', original.id).eq('updated_at', original.updated_at).select('id');
    if (error) throw error;
    if (data?.length !== 1) throw new Error(`Product ${original.id} changed during cutover.`);
    updatedProducts++;
  }
  for (const original of plan.slides) {
    const target = replaced(original.image_url, settings);
    if (target === original.image_url) continue;
    const { data, error } = await db.from('hero_slides').update({ image_url: target })
      .eq('id', original.id).eq('image_url', original.image_url).select('id');
    if (error) throw error;
    if (data?.length === 1) { updatedSlides++; continue; }
    const { data: current, error: readError } = await db.from('hero_slides')
      .select('image_url').eq('id', original.id).single();
    if (readError) throw readError;
    if (current.image_url !== target) throw new Error(`Slide ${original.id} changed during cutover.`);
  }
  console.log(JSON.stringify({ updatedProducts, updatedSlides, originalSupabaseObjectsDeleted: 0 }));
}

async function rollbackReferences(plan, settings) {
  let revertedProducts = 0;
  let revertedSlides = 0;
  for (const original of plan.products) {
    const migrated = {
      image: replaced(original.image, settings),
      images: Array.isArray(original.images)
        ? original.images.map((value) => replaced(value, settings))
        : original.images,
    };
    if (JSON.stringify([migrated.image, migrated.images]) === JSON.stringify([original.image, original.images])) continue;
    const { data: current, error: readError } = await db.from('products')
      .select('image,images,updated_at').eq('id', original.id).single();
    if (readError) throw readError;
    if (JSON.stringify([current.image, current.images]) === JSON.stringify([original.image, original.images])) continue;
    if (JSON.stringify([current.image, current.images]) !== JSON.stringify([migrated.image, migrated.images])) {
      throw new Error(`Product ${original.id} images changed after cutover; rollback stopped.`);
    }
    const { data, error } = await db.from('products')
      .update({ image: original.image, images: original.images })
      .eq('id', original.id).eq('updated_at', current.updated_at).select('id');
    if (error) throw error;
    if (data?.length !== 1) throw new Error(`Product ${original.id} changed during rollback.`);
    revertedProducts++;
  }
  for (const original of plan.slides) {
    const migrated = replaced(original.image_url, settings);
    if (migrated === original.image_url) continue;
    const { data, error } = await db.from('hero_slides')
      .update({ image_url: original.image_url })
      .eq('id', original.id).eq('image_url', migrated).select('id');
    if (error) throw error;
    if (data?.length === 1) { revertedSlides++; continue; }
    const { data: current, error: readError } = await db.from('hero_slides')
      .select('image_url').eq('id', original.id).single();
    if (readError) throw readError;
    if (current.image_url !== original.image_url) throw new Error(`Slide ${original.id} changed; rollback stopped.`);
  }
  console.log(JSON.stringify({ revertedProducts, revertedSlides, r2ObjectsDeleted: 0 }));
}

if (!copy && !switchDb && !rollbackDb && !verify) {
  const plan = {
    sourceOrigin,
    createdAt: new Date().toISOString(),
    products: await allRows('products', 'id,image,images,updated_at'),
    slides: await allRows('hero_slides', 'id,image_url'),
  };
  console.log(JSON.stringify({ mode: 'DRY_RUN', products: plan.products.length, slides: plan.slides.length, referencedObjects: mediaKeys(plan).length }));
  if (process.argv.includes('--save-plan')) {
    await fs.mkdir(outputDir, { recursive: true });
    try {
      await fs.writeFile(planFile, JSON.stringify(plan, null, 2), { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      throw new Error('Plan already exists; archive it before starting a new migration.');
    }
  }
} else {
  const plan = await readPlan();
  const settings = r2Settings();
  if (copy) await copyObjects(plan, settings);
  else if (switchDb) await switchReferences(plan, settings);
  else if (verify) {
    await checkPublicCopies(plan, settings);
    console.log(JSON.stringify({ mode: 'VERIFY_ONLY', verifiedPublicObjects: mediaKeys(plan).length, databaseWrites: 0, deletedObjects: 0 }));
  }
  else await rollbackReferences(plan, settings);
}
