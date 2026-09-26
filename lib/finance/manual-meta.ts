import { parseTryAmount } from './contribution.ts';

export type ManualMetaChannel = 'all' | 'store' | 'trendyol';
export type ManualMetaEntry = { key: string; version: number; startDate: string; endDate: string; channel: ManualMetaChannel; amountMinor: number; note: string };
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
export function istanbulDay(date: string): number {
  if (!dayPattern.test(date)) throw new Error('INVALID_DATE');
  const time = Date.parse(`${date}T00:00:00+03:00`);
  if (!Number.isFinite(time) || new Date(time + 10800000).toISOString().slice(0, 10) !== date) throw new Error('INVALID_DATE');
  return time;
}
export function validateManualMeta(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_RECORD');
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).some(k => !['requestId','key','expectedVersion','startDate','endDate','channel','amount','note'].includes(k))) throw new Error('INVALID_RECORD');
  if (typeof r.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(r.requestId)) throw new Error('INVALID_RECORD');
  if (typeof r.startDate !== 'string' || typeof r.endDate !== 'string' || typeof r.key !== 'string' || typeof r.channel !== 'string' || typeof r.note !== 'string' || typeof r.amount !== 'string' || !Number.isSafeInteger(r.expectedVersion) || Number(r.expectedVersion) < 0) throw new Error('INVALID_RECORD');
  const start = istanbulDay(r.startDate), end = istanbulDay(r.endDate);
  if (end < start || (end-start)/86400000 > 365 || !['all','store','trendyol'].includes(r.channel) || r.note.trim().length < 3 || r.note.length > 500) throw new Error('INVALID_RECORD');
  if (!new RegExp(`^${r.startDate}:meta-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`, 'i').test(r.key)) throw new Error('INVALID_KEY');
  const amountMinor = parseTryAmount(r.amount);
  if (amountMinor === null) throw new Error('INVALID_AMOUNT');
  return { requestId:r.requestId, key:r.key, expectedVersion:Number(r.expectedVersion), payload:{ source:'meta_manual_period', startDate:r.startDate, endDate:r.endDate, channel:r.channel as ManualMetaChannel, amountMinor, currency:'TRY', taxBasis:'inclusive', note:r.note.trim() } };
}
export function manualMetaEntry(row: { resource_key: string; version: number; payload: Record<string, unknown> }): ManualMetaEntry | null {
  const p = row.payload;
  if (p?.source !== 'meta_manual_period') return null;
  if (typeof p.startDate !== 'string' || typeof p.endDate !== 'string' || typeof p.note !== 'string' || !['all','store','trendyol'].includes(String(p.channel)) || !Number.isSafeInteger(p.amountMinor) || Number(p.amountMinor) < 0 || !row.resource_key.startsWith(`${p.startDate}:meta-`)) throw new Error('INVALID_META_RECORD');
  const start = istanbulDay(p.startDate), end = istanbulDay(p.endDate);
  if (end < start || !Number.isSafeInteger(row.version) || row.version < 1) throw new Error('INVALID_META_RECORD');
  return { key:row.resource_key, version:row.version, startDate:p.startDate, endDate:p.endDate, channel:p.channel as ManualMetaChannel, amountMinor:Number(p.amountMinor), note:p.note };
}
export function manualMetaSpend(entries: ManualMetaEntry[], since: number, until: number, channel: ManualMetaChannel) {
  if (!Number.isFinite(since) || !Number.isFinite(until) || since >= until) throw new Error('INVALID_PERIOD');
  let minor = 0;
  for (const entry of entries) {
    if (channel !== 'all' && entry.channel !== channel) continue;
    const start = istanbulDay(entry.startDate), end = istanbulDay(entry.endDate)+86400000;
    const left = Math.max(start,since), right = Math.min(end,until);
    if (left >= right) continue;
    const duration = end-start;
    minor += Math.round(entry.amountMinor*(right-start)/duration)-Math.round(entry.amountMinor*(left-start)/duration);
    if (!Number.isSafeInteger(minor)) throw new Error('AMOUNT_LIMIT');
  }
  return minor;
}
export function matchingManualMetaEntries(entries: ManualMetaEntry[], since: number, until: number, channel: ManualMetaChannel) {
  return entries.filter(entry => (channel === 'all' || entry.channel === channel) && istanbulDay(entry.startDate) < until && istanbulDay(entry.endDate)+86400000 > since);
}
