import { parseTryAmount } from './contribution.ts';

export type ProfitPlatform = 'store' | 'trendyol';
export type ProfitSettings = {
  vatBps: number; commissionBps: number; shippingMinor: number;
  packagingMinor: number; logisticsMinor: number; giftThresholdMinor: number;
  giftCostMinor: number; hiddenBps: number; advertisingBps: number;
};
export type ProfitProfile = { platform: ProfitPlatform; version: number; effective_from: string; settings: ProfitSettings };
const fields = ['vatBps', 'commissionBps', 'shippingMinor', 'packagingMinor', 'logisticsMinor', 'giftThresholdMinor', 'giftCostMinor', 'hiddenBps', 'advertisingBps'] as const;
export function validateProfitSettings(value: unknown): ProfitSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_SETTINGS');
  const r = value as Record<string, unknown>;
  if (Object.keys(r).length !== fields.length || fields.some(k => !Number.isSafeInteger(r[k]) || Number(r[k]) < 0 || Number(r[k]) > (k.endsWith('Bps') ? 10000 : 100_000_000))) throw new Error('INVALID_SETTINGS');
  if (Number(r.giftCostMinor) > 0 && Number(r.giftThresholdMinor) <= 0) throw new Error('INVALID_GIFT_RULE');
  return Object.fromEntries(fields.map(k => [k, r[k]])) as ProfitSettings;
}
export function calculateProfit(saleMinor: number, goodsMinor: number | null, settings: ProfitSettings) {
  validateProfitSettings(settings);
  if (!Number.isSafeInteger(saleMinor) || saleMinor < 0 || saleMinor > 100_000_000_000 || (goodsMinor !== null && (!Number.isSafeInteger(goodsMinor) || goodsMinor < 0 || goodsMinor > 100_000_000_000))) throw new Error('INVALID_AMOUNT');
  const vat = Math.round(saleMinor * settings.vatBps / (10000 + settings.vatBps));
  const commission = Math.round(saleMinor * settings.commissionBps / 10000);
  const hidden = Math.round(saleMinor * settings.hiddenBps / 10000);
  const advertising = Math.round(saleMinor * settings.advertisingBps / 10000);
  const gift = settings.giftCostMinor > 0 && saleMinor >= settings.giftThresholdMinor ? settings.giftCostMinor : 0;
  const deductions = { vat, commission, goods: goodsMinor, shipping: settings.shippingMinor, packaging: settings.packagingMinor, logistics: settings.logisticsMinor, gift, hidden, advertising };
  const profit = goodsMinor === null ? null : saleMinor - Object.values(deductions).reduce<number>((sum, n) => sum + (n ?? 0), 0);
  return { saleMinor, deductions, profitMinor: profit, margin: profit === null || saleMinor === 0 ? null : profit / saleMinor * 100 };
}
export function profileAt(profiles: ProfitProfile[], platform: ProfitPlatform, at: string) {
  const time = Date.parse(at);
  return profiles.filter(p => p.platform === platform && Date.parse(p.effective_from) <= time).sort((a, b) => b.version - a.version)[0] ?? null;
}
export function safeMoney(value: unknown): number | null {
  try { return typeof value === 'number' || typeof value === 'string' ? parseTryAmount(String(value)) : null; } catch { return null; }
}
export function snapshotGoods(lines: unknown): number | null {
  if (!Array.isArray(lines) || !lines.length) return null;
  let sum = 0;
  for (const line of lines) {
    const cost = line?.unitCost;
    if (!Number.isSafeInteger(line?.quantity) || line.quantity <= 0 || cost?.taxBasis !== 'inclusive' || cost.currency !== 'TRY' || !Number.isSafeInteger(cost.amountMinor) || cost.amountMinor < 0) return null;
    sum += cost.amountMinor * line.quantity;
    if (!Number.isSafeInteger(sum) || sum > 100_000_000_000) return null;
  }
  return sum;
}
