import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { profileAt, validateProfitSettings, type ProfitProfile } from '@/lib/finance/profit';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };

export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401, headers });
  const order = req.nextUrl.searchParams.get('order') || '';
  if (!/^[1-9][0-9]{0,29}$/.test(order)) return NextResponse.json({ error: 'Sipariş numarası geçersiz.' }, { status: 400, headers });
  const seller = process.env.TRENDYOL_SELLER_ID || '';
  const environment = process.env.TRENDYOL_ENVIRONMENT || '';
  if (!/^[1-9][0-9]{0,15}$/.test(seller) || !['production', 'stage'].includes(environment)) {
    return NextResponse.json({ error: 'Trendyol bağlantısı yapılandırılmamış.' }, { status: 503, headers });
  }
  try {
    const [claims, returns, checked, profiles] = await Promise.all([
      supabaseAdmin.from('trendyol_claim_mirror')
        .select('claim_id,original_package_id,claim_date,modified_at,statuses')
        .eq('seller_id', seller).eq('environment', environment).eq('order_number', order)
        .order('modified_at', { ascending: false }).limit(101).abortSignal(AbortSignal.timeout(8000)),
      supabaseAdmin.from('trendyol_return_settlement_mirror')
        .select('transaction_id,package_id,transaction_at,debt,credit,commission_amount,seller_revenue')
        .eq('seller_id', seller).eq('environment', environment).eq('order_number', order)
        .order('transaction_at', { ascending: false }).limit(101).abortSignal(AbortSignal.timeout(8000)),
      supabaseAdmin.from('trendyol_finance_windows').select('synced_at')
        .eq('seller_id', seller).eq('environment', environment)
        .order('synced_at', { ascending: false }).limit(1).abortSignal(AbortSignal.timeout(8000)),
      supabaseAdmin.from('profit_profiles').select('platform,version,effective_from,settings').eq('platform','trendyol').order('version').limit(1001).abortSignal(AbortSignal.timeout(8000)),
    ]);
    if (claims.error || returns.error || checked.error || profiles.error || !claims.data || !returns.data || !checked.data || !profiles.data || claims.data.length > 100 || returns.data.length > 100 || profiles.data.length > 1000) throw Error('ARCHIVE');
    const firstReturn = returns.data.at(-1);
    const profile = firstReturn ? profileAt(profiles.data as ProfitProfile[],'trendyol',firstReturn.transaction_at) : null;
    let returnShippingEstimateMinor: number | null = null;
    try { if (profile) returnShippingEstimateMinor = validateProfitSettings(profile.settings).shippingMinor; } catch { /* No verified setting for this date. */ }
    return NextResponse.json({ claims: claims.data, returns: returns.data, lastChecked: checked.data[0]?.synced_at || null, returnShippingEstimateMinor, returnShippingProfileVersion: returnShippingEstimateMinor === null ? null : profile?.version }, { headers });
  } catch {
    return NextResponse.json({ error: 'İade ve cari hesap kayıtları alınamadı.' }, { status: 503, headers });
  }
}
