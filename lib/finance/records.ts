import { parseTryAmount } from './contribution.ts';

export type FinanceRecordInput = {
  requestId: string; expectedVersion: number; kind: 'product_cost' | 'order_cost' | 'advertising' | 'sku_mapping';
  key: string; amount: string; taxBasis: 'inclusive' | 'exclusive'; note: string;
};
export function validateFinanceRecord(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_RECORD');
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).some(k => !['requestId', 'expectedVersion', 'kind', 'key', 'amount', 'taxBasis', 'note'].includes(k))) throw new Error('INVALID_RECORD');
  if (typeof r.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r.requestId)) throw new Error('INVALID_RECORD');
  if (!Number.isSafeInteger(r.expectedVersion) || Number(r.expectedVersion) < 0) throw new Error('INVALID_RECORD');
  if (!['product_cost', 'order_cost', 'advertising', 'sku_mapping'].includes(String(r.kind))) throw new Error('INVALID_RECORD');
  if (typeof r.key !== 'string' || !r.key.trim() || r.key.length > 160 || /[\x00-\x1f]/.test(r.key)) throw new Error('INVALID_RECORD');
  if (!['inclusive', 'exclusive'].includes(String(r.taxBasis)) || typeof r.amount !== 'string' || typeof r.note !== 'string' || r.note.trim().length < 3 || r.note.length > 500) throw new Error('INVALID_RECORD');
  const kind = r.kind as FinanceRecordInput['kind'], key = r.key.trim();
  // Cost keys identify one resource; ad keys identify a calendar day/campaign.
  if (kind === 'order_cost' && !/^[1-9]\d{0,14}:(paymentFees|packaging|shipping|returnCosts|goods)$/.test(key)) throw new Error('INVALID_KEY');
  if (kind === 'advertising') {
    const day = key.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}:[^:]{1,100}$/.test(key) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day) throw new Error('INVALID_KEY');
  }
  const amountMinor = kind === 'sku_mapping' ? null : parseTryAmount(r.amount);
  if (kind === 'sku_mapping' && (!r.amount.trim() || r.amount.length > 100 || /[\x00-\x1f]/.test(r.amount))) throw new Error('INVALID_RECORD');
  return { requestId: r.requestId, expectedVersion: Number(r.expectedVersion), kind, key,
    payload: kind === 'sku_mapping' ? { siteSku: r.amount.trim(), note: r.note.trim() } : { amountMinor, taxBasis: r.taxBasis, currency: 'TRY', note: r.note.trim() } };
}
