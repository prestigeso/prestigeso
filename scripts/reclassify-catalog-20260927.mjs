import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase yapılandırması eksik.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const apply = process.argv.includes('--apply');
const merged = ['Dekoratif Obje ve Biblo', 'Masa Süsleri', 'Tavla', 'Satranç'];
const oldNames = [...merged, 'Tesbihler'];

async function readRows() {
  const [categories, products] = await Promise.all([
    db.from('categories').select('id,name,slug').order('id').limit(1000),
    db.from('products').select('id,category').order('id').limit(1000),
  ]);
  if (categories.error || products.error || !categories.data || !products.data || categories.data.length >= 1000 || products.data.length >= 1000) throw new Error('Katalog eksik okunmuş olabilir; işlem durduruldu.');
  return { categories: categories.data, products: products.data };
}

function expectCategory(rows, name) {
  const category = rows.find(row => row.name === name);
  if (!category) throw new Error(`${name} kategorisi bulunamadı.`);
  return category;
}

async function moveProducts(from, to) {
  const { error } = await db.from('products').update({ category: to }).eq('category', from);
  if (error) throw new Error(`${from} ürünleri taşınamadı: ${error.code}`);
  const { count, error: checkError } = await db.from('products').select('id', { count: 'exact', head: true }).eq('category', from);
  if (checkError || count !== 0) throw new Error(`${from} içinde ürün kaldı; kategori silinmedi.`);
}

async function main() {
  const before = await readRows();
  expectCategory(before.categories, 'Masa Setleri');
  const earrings = expectCategory(before.categories, 'Küpeler');
  if (!['k-peler', 'kupeler'].includes(earrings.slug)) throw new Error('Küpeler bağlantısı beklenenden farklı; elle inceleyin.');
  const oldBeads = before.categories.find(row => row.name === 'Tesbihler');
  const newBeads = before.categories.find(row => row.name === 'Tespihler');
  if (Boolean(oldBeads) === Boolean(newBeads)) throw new Error('Tesbih/Tespih kategori durumu belirsiz.');
  if (newBeads && newBeads.slug !== 'tespihler') throw new Error('Tespihler bağlantısı beklenenden farklı.');
  const counts = Object.fromEntries(oldNames.map(name => [name, before.products.filter(row => row.category === name).length]));
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', totalProducts: before.products.length, moveCounts: counts, existingEarrings: before.products.filter(row => row.category === 'Küpeler').length }));
  if (!apply) return;

  for (const name of merged) {
    await moveProducts(name, 'Masa Setleri');
    const category = before.categories.find(row => row.name === name);
    if (category) {
      const { data, error } = await db.from('categories').delete().eq('id', category.id).eq('name', name).select('id');
      if (error || data?.length !== 1) throw new Error(`${name} kategorisi kaldırılamadı.`);
    }
  }

  if (oldBeads) {
    const { data, error } = await db.from('categories').update({ name: 'Tespihler', slug: 'tespihler' }).eq('id', oldBeads.id).eq('name', 'Tesbihler').select('id');
    if (error || data?.length !== 1) throw new Error('Tesbihler kategori adı değiştirilemedi.');
  }
  await moveProducts('Tesbihler', 'Tespihler');

  if (earrings.slug !== 'kupeler') {
    const { data, error } = await db.from('categories').update({ slug: 'kupeler' }).eq('id', earrings.id).eq('name', 'Küpeler').select('id');
    if (error || data?.length !== 1) throw new Error('Küpeler kategori bağlantısı düzeltilemedi.');
  }

  const after = await readRows();
  if (after.products.length !== before.products.length || after.products.some(row => oldNames.includes(row.category)) || after.categories.some(row => oldNames.includes(row.name))) throw new Error('Son doğrulama başarısız; katalog durumunu inceleyin.');
  const valid = new Set(after.categories.map(row => row.name));
  if (after.products.some(row => row.category && !valid.has(row.category))) throw new Error('Tanımsız kategoriye bağlı ürün bulundu.');
  const finalCounts = Object.fromEntries(['Masa Setleri', 'Tespihler', 'Küpeler'].map(name => [name, after.products.filter(row => row.category === name).length]));
  console.log(JSON.stringify({ status: 'verified', totalProducts: after.products.length, finalCounts }));
}

await main();
