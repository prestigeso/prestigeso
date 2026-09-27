import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { buildProfitReport, historicalGoods, type CostHistory, type ProfitSale } from '@/lib/finance/profit-report';
import { profileAt, snapshotGoods, validateProfitSettings, type ProfitProfile } from '@/lib/finance/profit';
import type { projectPackages } from '@/lib/trendyol/packages';
import { financeCoverage, returnHoldOrders, type FinanceWindow } from '@/lib/trendyol/finance';
import { archiveCoverage, type ArchiveJob } from '@/lib/trendyol/archive-coverage';
import { classifyTrendyolProfitPackage } from '@/lib/finance/trendyol-profit';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  if (!await isAdminRequest(req)) return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401, headers });
  const days = Number(req.nextUrl.searchParams.get('days') || 28);
  if (![1,2,7,28,90,365].includes(days)) return NextResponse.json({ error: 'Geçersiz dönem.' }, { status: 400, headers });
  const now = Date.now(), since = now - days * 86400000;
  try {
    const profiles = await supabaseAdmin.from('profit_profiles').select('platform,version,effective_from,settings').order('version').limit(1001);
    if (profiles.error || !profiles.data || profiles.data.length > 1000) throw new Error('PROFILES');
    const sales: ProfitSale[] = [];
    // Bounded pagination: fail rather than silently show an incomplete total.
    for (let offset = 0;; offset += 500) {
      const r = await supabaseAdmin.from('orders').select('id,total_amount,refunded_amount,payment_status,paid_at,phase2_order_cost_snapshots(lines)', { count: 'exact' }).gte('paid_at', new Date(since).toISOString()).lt('paid_at', new Date(now).toISOString()).order('id').range(offset, offset + 499).abortSignal(AbortSignal.timeout(8000));
      if (r.error || r.count === null || r.count > 10000) throw new Error('ORDERS');
      for (const o of r.data) {
        const snap = o.phase2_order_cost_snapshots;
        const lines = Array.isArray(snap) ? snap[0]?.lines : (snap as { lines?: unknown } | null)?.lines;
        sales.push({ id: String(o.id), platform: 'store', at: o.paid_at, amount: o.total_amount, eligible: o.payment_status === 'paid' && o.refunded_amount !== null && Number(o.refunded_amount) === 0, goods: snapshotGoods(lines) });
      }
      if (offset + r.data.length >= r.count) break;
      if (!r.data.length) throw new Error('INCOMPLETE');
    }
    const seller = process.env.TRENDYOL_SELLER_ID, environment = process.env.TRENDYOL_ENVIRONMENT;
    const returns = { count:0, debtMinor:0, shippingEstimateMinor:null as number|null, covered:false, salesCovered:false, archiveCovered:true };
    if (seller) {
      if (!['production', 'stage'].includes(environment || '')) throw new Error('CONFIG');
      const history: CostHistory[] = [];
      const catalog = await supabaseAdmin.from('products').select('"SKU",barcode').order('id').limit(1001).abortSignal(AbortSignal.timeout(8000));
      if (catalog.error || !catalog.data || catalog.data.length > 1000) throw Error('CATALOG');
      const claimRows: { order_number:string; original_package_id:string|null; statuses:string[] }[] = [];
      for (let offset = 0;;offset += 500) {
        const r = await supabaseAdmin.from('trendyol_claim_mirror').select('order_number,original_package_id,statuses',{count:'exact'}).eq('seller_id',seller).eq('environment',environment!).order('claim_id').range(offset,offset+499).abortSignal(AbortSignal.timeout(8000));
        if (r.error || r.count === null || r.count > 10000) throw Error('CLAIMS');
        claimRows.push(...r.data);
        if (offset+r.data.length >= r.count) break;
        if (!r.data.length) throw Error('INCOMPLETE');
      }
      const settlementRows: { order_number:string; package_id:string|null; transaction_at:string; debt:string|number; credit:string|number }[] = [];
      for (let offset = 0;;offset += 500) {
        const r = await supabaseAdmin.from('trendyol_return_settlement_mirror').select('order_number,package_id,transaction_at,debt,credit',{count:'exact'}).eq('seller_id',seller).eq('environment',environment!).gte('transaction_at',new Date(since).toISOString()).lt('transaction_at',new Date(now).toISOString()).order('transaction_id').range(offset,offset+499).abortSignal(AbortSignal.timeout(8000));
        if (r.error || r.count === null || r.count > 10000) throw Error('RETURNS');
        settlementRows.push(...r.data);
        if (offset+r.data.length >= r.count) break;
        if (!r.data.length) throw Error('INCOMPLETE');
      }
      const heldOrders = returnHoldOrders(claimRows,settlementRows);
      const windows = await supabaseAdmin.from('trendyol_finance_windows').select('starts_at,ends_at,synced_at').eq('seller_id',seller).eq('environment',environment!).order('starts_at').limit(100);
      if (windows.error || !windows.data || windows.data.length >= 100) throw Error('FINANCE_WINDOWS');
      const jobs = await supabaseAdmin.from('trendyol_sync_jobs').select('starts_at,ends_at,status').eq('seller_id',seller).eq('environment',environment!).gte('ends_at',String(since)).order('starts_at').limit(1001).abortSignal(AbortSignal.timeout(8000));
      if (jobs.error || !jobs.data || jobs.data.length > 1000) throw Error('ARCHIVE_COVERAGE');
      returns.archiveCovered = archiveCoverage(since,now,jobs.data as ArchiveJob[]).complete;
      const archived: ReturnType<typeof projectPackages>['packages'] = [];
      for (let offset = 0;; offset += 1000) {
        const r = await supabaseAdmin.from('phase2_record_history').select('kind,resource_key,recorded_at,version,payload', { count: 'exact' }).in('kind', ['product_cost', 'sku_mapping']).lt('recorded_at', new Date(now).toISOString()).order('request_id').range(offset, offset + 999).abortSignal(AbortSignal.timeout(8000));
        if (r.error || r.count === null || r.count > 20000) throw new Error('COST_HISTORY');
        history.push(...r.data as CostHistory[]);
        if (offset + r.data.length >= r.count) break;
        if (!r.data.length) throw new Error('INCOMPLETE');
      }
      for (let offset = 0;; offset += 500) {
        const r = await supabaseAdmin.from('trendyol_package_mirror').select('payload', { count: 'exact' }).eq('seller_id', seller).eq('environment', environment!).gte('payload->>orderDate', String(since)).lt('payload->>orderDate', String(now)).order('package_id').range(offset, offset + 499).abortSignal(AbortSignal.timeout(8000));
        if (r.error || r.count === null || r.count > 10000) throw new Error('PACKAGES');
        for (const row of r.data) {
          const p = row.payload as ReturnType<typeof projectPackages>['packages'][number];
          archived.push(p);
          const at = new Date(p.orderDate).toISOString();
          // Order-level hold is conservative for split/partial returns until line-level ledger reconciliation exists.
          const returned = heldOrders.has(p.orderNumber);
          const classification = classifyTrendyolProfitPackage(p, returned);
          const cost = historicalGoods(p.lines, history, at, catalog.data);
          sales.push({ id: `${p.orderNumber} / ${p.packageId}`, platform: 'trendyol', at, amount: p.amount, ...classification, goods: cost.amount, currentCostEstimate: cost.currentCostEstimate });
        }
        if (offset + r.data.length >= r.count) break;
        if (!r.data.length) throw new Error('INCOMPLETE');
      }
      const first = archived.length ? Math.min(...archived.map(p=>p.orderDate)) : since;
      returns.salesCovered = returns.archiveCovered && (!archived.length || financeCoverage(first,now,windows.data as FinanceWindow[],now));
      returns.covered = financeCoverage(since,now,windows.data as FinanceWindow[],now);
      if (!returns.salesCovered) for (const sale of sales) if (sale.platform === 'trendyol') { sale.eligible=false;sale.exclusion=returns.archiveCovered?'İade ve cari hesap arşivi henüz güncel değil':'Sipariş arşivi seçili dönemi tam kapsamıyor'; }
      returns.count = settlementRows.length;
      for (const r of settlementRows) { const debt = Number(r.debt),credit=Number(r.credit); if (!Number.isFinite(debt) || !Number.isFinite(credit)) throw Error('RETURN_AMOUNT');returns.debtMinor += Math.round((debt-credit)*100);if (!Number.isSafeInteger(returns.debtMinor)) throw Error('RETURN_AMOUNT'); }
      const byOrder = new Map(settlementRows.map(row => [row.order_number,row]));
      let shipping = 0, complete = true;
      for (const row of byOrder.values()) {
        const profile = profileAt(profiles.data as ProfitProfile[],'trendyol',row.transaction_at);
        try { if (!profile) { complete = false; break; } validateProfitSettings(profile.settings); shipping += profile.settings.shippingMinor; }
        catch { complete = false; break; }
      }
      returns.shippingEstimateMinor = complete ? shipping : null;
    }
    return NextResponse.json({ ...buildProfitReport(sales.sort((a,b) => Date.parse(b.at)-Date.parse(a.at)), profiles.data as ProfitProfile[]), returns, period:{since,until:now} }, { headers });
  } catch { return NextResponse.json({ error: 'Kâr raporu tamamlanamadı. Kâr analizi SQL güncellemesini ve veritabanı bağlantısını kontrol edin; eksik toplam gösterilmedi.' }, { status: 503, headers }); }
}
