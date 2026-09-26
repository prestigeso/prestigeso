import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { consumeRateLimit } from '@/lib/rateLimit';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchFinanceWindow, FINANCE_WINDOW_MS, nextFinanceWindow, type FinanceWindow } from '@/lib/trendyol/finance';
export const runtime = 'nodejs';
const headers = { 'Cache-Control':'no-store', 'Retry-After':'5' };

export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error:'Yetkisiz erişim.' },{ status:401,headers });
  if (process.env.TRENDYOL_SYNC_ENABLED !== '1') return NextResponse.json({ error:'Senkronizasyon kapalı.',disabled:true },{ status:503,headers });
  const seller = process.env.TRENDYOL_SELLER_ID || '', environment = process.env.TRENDYOL_ENVIRONMENT;
  if (!/^[1-9][0-9]{0,15}$/.test(seller) || !['production','stage'].includes(environment || '') || !process.env.TRENDYOL_API_KEY || !process.env.TRENDYOL_API_SECRET)
    return NextResponse.json({ error:'Trendyol bağlantısı eksik.',configuration:true },{ status:503,headers });
  try {
    const budget = await consumeRateLimit({ bucket:'trendyol-sync-global',identifier:seller,maxRequests:1,windowSeconds:5 });
    if (!budget.allowed) return NextResponse.json({ error:'Senkronizasyon sırada.' },{ status:429,headers });
    const now = Date.now();
    const windows = await supabaseAdmin.from('trendyol_finance_windows').select('starts_at,ends_at,synced_at').eq('seller_id',seller).eq('environment',environment!).order('starts_at').limit(100);
    if (windows.error || !windows.data || windows.data.length >= 100) throw Error('MIRROR');
    const start = nextFinanceWindow(windows.data as FinanceWindow[],now);
    if (start === null) return NextResponse.json({ complete:true,fresh:true },{ headers });
    const records = await fetchFinanceWindow({ sellerId:seller, environment:environment as 'production'|'stage',apiKey:process.env.TRENDYOL_API_KEY!,apiSecret:process.env.TRENDYOL_API_SECRET! },start,Math.min(now,start+FINANCE_WINDOW_MS));
    const saved = await supabaseAdmin.rpc('trendyol_apply_finance_window',{ p_seller:seller,p_environment:environment,p_start:start,p_end:start+FINANCE_WINDOW_MS,p_claims:records.claims,p_returns:records.returns });
    if (saved.error) throw Error('APPLY');
    const next = nextFinanceWindow([...windows.data.filter(w => Number(w.starts_at) !== start),{ starts_at:start,ends_at:start+FINANCE_WINDOW_MS,synced_at:new Date(now).toISOString() }],now);
    return NextResponse.json({ complete:next === null,count:records.claims.length,returnCount:records.returns.length },{ headers });
  } catch {
    return NextResponse.json({ error:'İade ve cari hesap arşivi güncellenemedi; eksik veriden kâr tahmini gösterilmeyecek.' },{ status:503,headers });
  }
}
