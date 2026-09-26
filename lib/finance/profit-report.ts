import { calculateProfit, profileAt, safeMoney, snapshotGoods, validateProfitSettings, type ProfitProfile, type ProfitPlatform } from './profit.ts';
export type CostHistory = { kind: string; resource_key: string; recorded_at: string; version: number; payload: { amountMinor?: number | null; taxBasis?: string; currency?: string; siteSku?: string } };
export type ProfitSale = { id: string; platform: ProfitPlatform; at: string; amount: unknown; eligible: boolean; exclusion?: string; goods: number | null };
export function historicalGoods(lines: { sku: string; quantity: number }[], history: CostHistory[], at: string) {
  if (!lines.length) return null;
  const find = (kind: string, key: string) => history.filter(h => h.kind === kind && h.resource_key === key && Date.parse(h.recorded_at) <= Date.parse(at)).sort((a, b) => b.version - a.version)[0];
  const snapshots = lines.map(l => {
    const mapped = find('sku_mapping', l.sku)?.payload.siteSku;
    const cost = find('product_cost', mapped || l.sku);
    return { quantity: l.quantity, unitCost: cost?.payload ?? null };
  });
  return snapshotGoods(snapshots);
}
export function buildProfitReport(sales: ProfitSale[], profiles: ProfitProfile[]) {
  const rows = sales.map(sale => {
    const profile = profileAt(profiles, sale.platform, sale.at);
    const amount = safeMoney(sale.amount);
    let completeProfile = false;
    try { if (profile) { validateProfitSettings(profile.settings);completeProfile=true; } } catch { /* An old six-field profile cannot silently mean zero logistics or gift expense. */ }
    const reason = !sale.eligible ? sale.exclusion || 'İptal/iade veya doğrulanmamış satış' : !profile ? 'Bu tarih için gider ayarı yok' : !completeProfile ? 'Bu tarih için eski gider ayarı eksik; yeni sürüm gerekli' : amount === null ? 'Satış tutarı geçersiz' : sale.goods === null ? 'Satış tarihine ait ürün maliyeti eksik' : null;
    return { id: sale.id, platform: sale.platform, at: sale.at, profileVersion: profile?.version ?? null, reason, result: !reason && profile && amount !== null ? calculateProfit(amount, sale.goods, profile.settings) : null };
  });
  const included = rows.filter(r => r.result !== null);
  return { rows, included: included.length, excluded: rows.length - included.length,
    saleMinor: included.reduce((s, r) => s + r.result!.saleMinor, 0),
    profitMinor: included.length ? included.reduce((s, r) => s + r.result!.profitMinor!, 0) : null };
}
