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
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { validateR2Environment } from './lib/r2-environment.mjs';

const copy = process.argv.includes('--copy');
const switchDb = process.argv.includes('--switch-db');
const rollbackDb = process.argv.includes('--rollback-db');
const verify = process.argv.includes('--verify');
const auditSwitch = process.argv.includes('--audit-switch');
if ([copy, switchDb, rollbackDb, verify, auditSwitch].filter(Boolean).length > 1) {
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

function retryable(error) {
  return ['ECONNABORTED', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_SOCKET', 'UND_ERR_HEADERS_TIMEOUT'].includes(error?.code) ||
    ['AbortError', 'TimeoutError'].includes(error?.name) || error?.message === 'aborted' ||
    [429, 500, 502, 503, 504].includes(error?.$metadata?.httpStatusCode);
}

async function withNetworkRetry(operation) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= 5 || !retryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  }
}

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
  const rawBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim() || '';
  if (!rawBaseUrl) throw new Error('R2_PUBLIC_BASE_URL is required.');
  const baseUrl = new URL(rawBaseUrl);
  if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password || baseUrl.port || baseUrl.pathname !== '/' || baseUrl.search || baseUrl.hash || baseUrl.hostname.endsWith('.r2.dev') || baseUrl.hostname.endsWith('.r2.cloudflarestorage.com')) {
    throw new Error('R2_PUBLIC_BASE_URL must be an HTTPS origin.');
  }
  // The copy needs S3 credentials; public verification and database URL
  // switching only need the custom domain and the saved hash manifest.
  if (!copy) return { baseUrl };
  const issues = validateR2Environment({ ...process.env, PRODUCT_MEDIA_BACKEND: 'r2' });
  if (issues.length) throw new Error(`Missing or invalid R2 settings: ${issues.join(', ')}`);
  const account = process.env.R2_ACCOUNT_ID?.trim() || '';
  const bucket = process.env.R2_BUCKET?.trim() || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || '';
  if (!/^[a-f0-9]{32}$/i.test(account) || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 account, bucket and keys are required to copy objects.');
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
    forcePathStyle: true,
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

const publicIpv4Cache = new Map();
const pinnedPublicIpv4 = process.env.R2_PUBLIC_IPV4?.trim() || '';
if (pinnedPublicIpv4 && net.isIP(pinnedPublicIpv4) !== 4) {
  throw new Error('R2_PUBLIC_IPV4 must be a valid IPv4 address.');
}
function lookupPublicIpv4(hostname, options, callback) {
  const complete = (address) => {
    if (options?.all) callback(null, [{ address, family: 4 }]);
    else callback(null, address, 4);
  };
  const cached = pinnedPublicIpv4 || publicIpv4Cache.get(hostname);
  if (cached) {
    complete(cached);
    return;
  }
  dns.resolve4(hostname).then(
    (addresses) => {
      if (!addresses[0]) throw new Error(`No public IPv4 address for ${hostname}`);
      publicIpv4Cache.set(hostname, addresses[0]);
      complete(addresses[0]);
    },
    callback,
  ).catch(callback);
}
const publicAgent = new https.Agent({ keepAlive: true, maxSockets: 4, lookup: lookupPublicIpv4 });

function publicImageHead(url, expectedBytes) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'HEAD', agent: publicAgent, timeout: 15000,
    }, (response) => {
      const status = response.statusCode;
      const type = response.headers['content-type'];
      const bytes = Number(response.headers['content-length']);
      response.resume();
      if (status !== 200 || !type?.startsWith('image/') || bytes !== expectedBytes) {
        const error = new Error(`Public R2 HEAD mismatch: status=${status}, type=${type}, bytes=${bytes}`);
        error.code = [429, 500, 502, 503, 504].includes(status) ? 'ETIMEDOUT' : 'BAD_RESPONSE';
        reject(error);
        return;
      }
      resolve();
    });
    request.on('timeout', () => {
      const error = new Error('Public R2 HEAD timed out.');
      error.code = 'ETIMEDOUT';
      request.destroy(error);
    });
    request.on('error', reject);
    request.end();
  });
}

function publicImageBody(url, expectedBytes) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      agent: publicAgent,
      timeout: 30000,
    }, (response) => {
      if (response.statusCode !== 200 || !response.headers['content-type']?.startsWith('image/')) {
        const error = new Error(`Public R2 URL is not ready (${response.statusCode})`);
        error.code = [429, 500, 502, 503, 504].includes(response.statusCode) ? 'ETIMEDOUT' : 'BAD_RESPONSE';
        response.resume();
        reject(error);
        return;
      }
      const chunks = [];
      let bytes = 0;
      response.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes > expectedBytes) {
          request.destroy(new Error('Public R2 image is larger than the verified source.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    request.on('timeout', () => {
      const error = new Error('Public R2 request timed out.');
      error.code = 'ETIMEDOUT';
      request.destroy(error);
    });
    request.on('error', reject);
  });
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
  const keys = mediaKeys(plan);
  let nextIndex = 0;
  const sampleIndexes = new Set([0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.floor((keys.length - 1) * fraction)));
  // Every source hash was matched against an R2 GET during copy. The public
  // gate checks every HTTPS object and fully hashes distributed samples.
  try {
    await Promise.all(Array.from({ length: Math.min(4, keys.length) }, async () => {
      for (;;) {
        const index = nextIndex++;
        if (index >= keys.length) return;
        const key = keys[index];
        try {
          const entry = verified.get(key);
          if (!entry || entry.url !== r2Url(settings, key)) throw new Error(`Unverified R2 object: ${key}`);
          await withNetworkRetry(() => publicImageHead(entry.url, entry.bytes));
          if (sampleIndexes.has(index)) {
            const publicBody = await withNetworkRetry(() => publicImageBody(entry.url, entry.bytes));
            if (publicBody.length !== entry.bytes || sha256(publicBody) !== entry.sha256) {
              throw new Error(`Public R2 image checksum differs: ${key}`);
            }
          }
          if ((index + 1) % 25 === 0) console.log(`Public verification reached ${index + 1}/${keys.length}`);
        } catch (error) {
          throw new Error(`Public verification stopped at ${key}: ${error.message}`, { cause: error });
        }
      }
    }));
  } finally {
    publicAgent.destroy();
  }
  return { publicHeadObjects: keys.length, sampledPublicHashes: sampleIndexes.size };
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
  if (current.products.length !== plan.products.length || current.slides.length !== plan.slides.length) {
    throw new Error('Product or slide count changed after planning; create a new plan.');
  }
  const productsById = new Map(current.products.map((row) => [row.id, row]));
  const slidesById = new Map(current.slides.map((row) => [row.id, row]));
  for (const original of plan.products) {
    const row = productsById.get(original.id);
    if (!row || JSON.stringify([row.image, row.images]) !==
        JSON.stringify([original.image, original.images])) {
      const desired = {
        image: replaced(original.image, settings),
        images: Array.isArray(original.images)
          ? original.images.map((value) => replaced(value, settings))
          : original.images,
      };
      if (!row || JSON.stringify([row.image, row.images]) !== JSON.stringify([desired.image, desired.images])) {
        throw new Error(`Product ${original.id} changed after planning; stopped before database writes.`);
      }
    }
  }
  for (const original of plan.slides) {
    const row = slidesById.get(original.id);
    if (!row || (row.image_url !== original.image_url && row.image_url !== replaced(original.image_url, settings))) {
      throw new Error(`Slide ${original.id} changed after planning; stopped before database writes.`);
    }
  }
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
    if (JSON.stringify([current.image, current.images]) !==
        JSON.stringify([original.image, original.images])) {
      throw new Error(`Product ${original.id} changed after the plan; stopped without overwriting it.`);
    }
    const { data, error } = await db.from('products').update(desired)
      .eq('id', original.id).eq('updated_at', current.updated_at).select('id');
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

if (auditSwitch) {
  const plan = await readPlan();
  const settings = r2Settings();
  const products = new Map((await allRows('products', 'id,image,images')).map((row) => [row.id, row]));
  const slides = new Map((await allRows('hero_slides', 'id,image_url')).map((row) => [row.id, row]));
  const productStatus = { atTarget: 0, atOriginal: 0, diverged: [] };
  const slideStatus = { atTarget: 0, atOriginal: 0, diverged: [] };
  for (const original of plan.products) {
    const current = products.get(original.id);
    const target = [replaced(original.image, settings),
      Array.isArray(original.images) ? original.images.map((value) => replaced(value, settings)) : original.images];
    const actual = [current?.image, current?.images];
    if (current && JSON.stringify(actual) === JSON.stringify(target)) productStatus.atTarget++;
    else if (current && JSON.stringify(actual) === JSON.stringify([original.image, original.images])) productStatus.atOriginal++;
    else productStatus.diverged.push(original.id);
  }
  for (const original of plan.slides) {
    const current = slides.get(original.id);
    if (current?.image_url === replaced(original.image_url, settings)) slideStatus.atTarget++;
    else if (current?.image_url === original.image_url) slideStatus.atOriginal++;
    else slideStatus.diverged.push(original.id);
  }
  console.log(JSON.stringify({ mode: 'AUDIT_SWITCH', productStatus, slideStatus,
    productCount: products.size, slideCount: slides.size }));
} else if (!copy && !switchDb && !rollbackDb && !verify) {
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
    const result = await checkPublicCopies(plan, settings);
    console.log(JSON.stringify({ mode: 'VERIFY_ONLY', ...result, databaseWrites: 0, deletedObjects: 0 }));
  }
  else await rollbackReferences(plan, settings);
}
