import { calculateProfit, profileAt, safeMoney, snapshotGoods, validateProfitSettings, type ProfitProfile, type ProfitPlatform } from './profit.ts';
import { resolveSiteSku, type CatalogProduct } from '../trendyol/product-match.ts';
export type CostHistory = { kind: string; resource_key: string; recorded_at: string; version: number; payload: { amountMinor?: number | null; taxBasis?: string; currency?: string; siteSku?: string } };
export type ProfitSale = { id: string; platform: ProfitPlatform; at: string; amount: unknown; eligible: boolean; exclusion?: string; goods: number | null; currentCostEstimate?: boolean; discountFundingUnknown?: boolean };
export function historicalGoods(lines: { sku: string; barcode?: string | null; quantity: number }[], history: CostHistory[], at: string, products: CatalogProduct[] = []) {
  if (!lines.length) return { amount: null, currentCostEstimate: false };
  const find = (kind: string, key: string) => history.filter(h => h.kind === kind && h.resource_key === key && Date.parse(h.recorded_at) <= Date.parse(at)).sort((a, b) => b.version - a.version)[0];
  const latest = (kind: string, key: string) => history.filter(h => h.kind === kind && h.resource_key === key).sort((a, b) => b.version - a.version)[0];
  // A mapping identifies the product, not a historical price: a correction can
  // identify an old sale, while a later cost must remain labelled an estimate.
  const mappings = new Map(history.filter(h => h.kind === 'sku_mapping').sort((a, b) => a.version - b.version).map(h => [h.resource_key, h.payload.siteSku || '']));
  let currentCostEstimate = false;
  const snapshots = lines.map(l => {
    const siteSku = resolveSiteSku(l, products, mappings);
    const historic = siteSku ? find('product_cost', siteSku) : null;
    const cost = historic || (siteSku ? latest('product_cost', siteSku) : null);
    if (!historic && cost) currentCostEstimate = true;
    return { quantity: l.quantity, unitCost: cost?.payload ?? null };
  });
  return { amount: snapshotGoods(snapshots), currentCostEstimate };
}
export function buildProfitReport(sales: ProfitSale[], profiles: ProfitProfile[]) {
  const rows = sales.map(sale => {
    const profile = profileAt(profiles, sale.platform, sale.at);
    const amount = safeMoney(sale.amount);
    let completeProfile = false;
    try { if (profile) { validateProfitSettings(profile.settings);completeProfile=true; } } catch { /* An old six-field profile cannot silently mean zero logistics or gift expense. */ }
    const reason = !sale.eligible ? sale.exclusion || 'İptal/iade veya doğrulanmamış satış' : !profile ? 'Bu tarih için gider ayarı yok' : !completeProfile ? 'Bu tarih için eski gider ayarı eksik; yeni sürüm gerekli' : amount === null ? 'Satış tutarı geçersiz' : sale.goods === null ? 'Satış tarihine ait ürün maliyeti eksik' : null;
    return { id: sale.id, platform: sale.platform, at: sale.at, profileVersion: profile?.version ?? null, reason, currentCostEstimate: Boolean(sale.currentCostEstimate), discountFundingUnknown: Boolean(sale.discountFundingUnknown), result: !reason && profile && amount !== null ? calculateProfit(amount, sale.goods, profile.settings) : null };
  });
  const included = rows.filter(r => r.result !== null);
  return { rows, included: included.length, excluded: rows.length - included.length,
    saleMinor: included.reduce((s, r) => s + r.result!.saleMinor, 0),
    profitMinor: included.length ? included.reduce((s, r) => s + r.result!.profitMinor!, 0) : null };
}
