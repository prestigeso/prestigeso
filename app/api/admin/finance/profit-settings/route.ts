import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { limitedJson } from '@/lib/http/limitedJson';
import { consumeRateLimit, getClientIp } from '@/lib/rateLimit';
import { validateProfitSettings } from '@/lib/finance/profit';
export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401, headers });
  const { data, error } = await supabaseAdmin.from('profit_profiles').select('platform,version,effective_from,settings').order('version', { ascending: false }).limit(1001);
  if (error || !data || data.length > 1000) return NextResponse.json({ error: 'Kâr ayarları okunamadı. Kâr analizi SQL güncellemesini kontrol edin.' }, { status: 503, headers });
  return NextResponse.json({ profiles: data }, { headers });
}
export async function POST(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401, headers });
  try {
    const r = await limitedJson(req, 4096) as Record<string, unknown>;
    if (!r || Object.keys(r).sort().join() !== ['effectiveFrom','expectedVersion','platform','requestId','settings'].sort().join() || !['store','trendyol'].includes(String(r.platform)) || !Number.isSafeInteger(r.expectedVersion) || Number(r.expectedVersion) < 0 || typeof r.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(r.requestId) || typeof r.effectiveFrom !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(r.effectiveFrom) || !Number.isFinite(Date.parse(r.effectiveFrom)) || Date.parse(r.effectiveFrom) > Date.now()) throw new Error('INVALID');
    const settings = validateProfitSettings(r.settings);
    const rate = await consumeRateLimit({ bucket: 'profit-settings', identifier: getClientIp(req), maxRequests: 10, windowSeconds: 60 });
    if (!rate.allowed) return NextResponse.json({ error: 'İstek sınırı.' }, { status: 429, headers });
    const { data, error } = await supabaseAdmin.rpc('save_profit_profile', { p_request: r.requestId, p_platform: r.platform, p_expected: r.expectedVersion, p_effective: r.effectiveFrom, p_settings: settings });
    if (error) return NextResponse.json({ error: /CONFLICT/.test(error.message) ? 'Ayar sürümü değişmiş. Güncel ayarları yükleyip tekrar deneyin.' : 'Ayar kaydedilemedi. Kâr profili tarih ve gider SQL güncellemesini kontrol edin.' }, { status: /CONFLICT/.test(error.message) ? 409 : 503, headers });
    return NextResponse.json({ version: data }, { headers });
  } catch { return NextResponse.json({ error: 'Geçerli tutar, oran ve başlangıç tarihi girin.' }, { status: 400, headers }); }
}
