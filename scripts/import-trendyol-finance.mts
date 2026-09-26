import { createClient } from '@supabase/supabase-js';
import { fetchFinanceWindow, FINANCE_WINDOW_MS, nextFinanceWindow, type FinanceWindow } from '../lib/trendyol/finance.ts';

// Explicit operator action. Reads Trendyol with GET and writes only the private finance mirror.
if (!process.argv.includes('--apply')) throw new Error('Explicit --apply required');
const seller = process.env.TRENDYOL_SELLER_ID || '';
const environment = process.env.TRENDYOL_ENVIRONMENT;
const apiKey = process.env.TRENDYOL_API_KEY || '';
const apiSecret = process.env.TRENDYOL_API_SECRET || '';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!/^[1-9][0-9]{0,15}$/.test(seller) || (environment !== 'production' && environment !== 'stage') || !apiKey || !apiSecret || !url || !serviceKey) {
  throw new Error('Trendyol or database configuration is incomplete');
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
let completed = 0;
for (let attempt = 0; attempt < 12; attempt++) {
  const now = Date.now();
  const existing = await db.from('trendyol_finance_windows')
    .select('starts_at,ends_at,synced_at')
    .eq('seller_id', seller).eq('environment', environment).order('starts_at').limit(100);
  if (existing.error || !existing.data || existing.data.length >= 100) throw new Error(`Window read failed: ${existing.error?.code || 'capacity'}`);
  const start = nextFinanceWindow(existing.data as FinanceWindow[], now);
  if (start === null) {
    console.log(JSON.stringify({ complete: true, windowsProcessed: completed }));
    break;
  }
  if (attempt) await new Promise(resolve => setTimeout(resolve, 5500));
  const records = await fetchFinanceWindow({ sellerId: seller, environment, apiKey, apiSecret }, start, Math.min(Date.now(), start + FINANCE_WINDOW_MS));
  const saved = await db.rpc('trendyol_apply_finance_window', {
    p_seller: seller, p_environment: environment, p_start: start, p_end: start + FINANCE_WINDOW_MS,
    p_claims: records.claims, p_returns: records.returns,
  });
  if (saved.error) throw new Error(`Window save failed: ${saved.error.code}`);
  const verified = await db.from('trendyol_finance_windows').select('starts_at,ends_at')
    .eq('seller_id', seller).eq('environment', environment).eq('starts_at', start).single();
  if (verified.error || Number(verified.data?.ends_at) !== start + FINANCE_WINDOW_MS) throw new Error('Saved window could not be verified');
  completed++;
  console.log(JSON.stringify({ windowStart: new Date(start).toISOString(), claims: records.claims.length, returns: records.returns.length, windowsProcessed: completed }));
  if (attempt === 11) throw new Error('Window limit reached; rerun to continue');
}
