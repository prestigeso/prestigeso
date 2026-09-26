import type { TrendyolConfig } from './packages.ts';

export const FINANCE_WINDOW_MS = 14 * 86400000;
export const FINANCE_HISTORY_MS = 89 * 86400000;
export const FINANCE_FRESH_MS = 6 * 3600000;

export type ClaimRecord = { seller_id: string; environment: string; claim_id: string; order_number: string; original_package_id: string | null; claim_date: number; modified_at: number; statuses: string[] };
export type SettlementReturn = { seller_id: string; environment: string; transaction_id: string; order_number: string; package_id: string | null; transaction_at: string; debt: number; credit: number; commission_amount: number | null; seller_revenue: number | null };
export type FinanceWindow = { starts_at: number; ends_at: number; synced_at: string };

function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('PROVIDER_SCHEMA');
  return value as Record<string, unknown>;
}
function digits(value: unknown, optional = false): string | null {
  const text = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  if (optional && (text === null || text === undefined)) return null;
  if (typeof text !== 'string' || !/^[1-9][0-9]{0,29}$/.test(text)) throw Error('PROVIDER_SCHEMA');
  return text;
}
function timestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) throw Error('PROVIDER_SCHEMA');
  return value;
}
function money(value: unknown, optional = false): number | null {
  if (optional && value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e9) throw Error('PROVIDER_SCHEMA');
  return value;
}
function pages(value: unknown, page: number, size: number): { content: unknown[]; done: boolean } {
  const body = obj(value);
  if (!Number.isSafeInteger(body.totalPages) || !Number.isSafeInteger(body.totalElements) || !Number.isSafeInteger(body.page) || body.page !== page || Number(body.totalPages) > 5 || Number(body.totalElements) > size * 5) throw Error('PROVIDER_CAPACITY');
  const content = body.content === null && body.totalElements === 0 ? [] : body.content;
  if (!Array.isArray(content) || content.length > size || (page < Number(body.totalPages) && !content.length)) throw Error('PROVIDER_SCHEMA');
  return { content, done: page + 1 >= Number(body.totalPages) };
}
async function getJson(config: TrendyolConfig, endpoint: 'claims' | 'settlements', start: number, end: number, page: number, request: typeof fetch): Promise<unknown> {
  if (!/^[1-9][0-9]{0,15}$/.test(config.sellerId) || !config.apiKey || !config.apiSecret || /[\r\n:]/.test(config.apiKey) || /[\r\n]/.test(config.apiSecret) || !['stage','production'].includes(config.environment)) throw Error('CONFIGURATION_REQUIRED');
  if (![start,end,page].every(Number.isSafeInteger) || start < 0 || end <= start || end - start > FINANCE_WINDOW_MS || page < 0 || page > 4) throw Error('QUERY_INVALID');
  const host = config.environment === 'production' ? 'apigw.trendyol.com' : 'stageapigw.trendyol.com';
  const path = endpoint === 'claims' ? `/integration/order/sellers/${config.sellerId}/claims` : `/integration/finance/che/sellers/${config.sellerId}/settlements`;
  const url = new URL(`https://${host}${path}`);
  url.search = new URLSearchParams({ startDate:String(start), endDate:String(end), page:String(page), size:endpoint === 'claims' ? '50' : '500', ...(endpoint === 'settlements' ? { transactionType:'Return' } : {}) }).toString();
  let response: Response;
  try { response = await request(url,{ method:'GET', redirect:'error', cache:'no-store', signal:AbortSignal.timeout(12000), headers:{ Authorization:`Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`, 'User-Agent':`${config.sellerId} - SelfIntegration`, Accept:'application/json' } }); }
  catch { throw Error('PROVIDER_UNAVAILABLE'); }
  if (response.status === 401 || response.status === 403) throw Error('PROVIDER_AUTH');
  if (response.status === 429) throw Error('PROVIDER_RATE_LIMIT');
  if (!response.ok) throw Error('PROVIDER_UNAVAILABLE');
  if (Number(response.headers.get('content-length')) > 2 * 1024 * 1024) throw Error('PROVIDER_CAPACITY');
  if (!response.body) throw Error('PROVIDER_SCHEMA');
  const reader = response.body.getReader(),decoder = new TextDecoder();
  let bytes = 0,body = '';
  try { for (;;) { const {done,value}=await reader.read();if (done) break;bytes+=value.byteLength;if (bytes>2*1024*1024) { await reader.cancel();throw Error('PROVIDER_CAPACITY'); }body+=decoder.decode(value,{stream:true}); } }
  finally { reader.releaseLock(); }
  try { return JSON.parse(body+decoder.decode()); } catch { throw Error('PROVIDER_SCHEMA'); }
}
export async function fetchFinanceWindow(config: TrendyolConfig, start: number, end: number, request: typeof fetch = fetch) {
  const claims: ClaimRecord[] = [], returns: SettlementReturn[] = [];
  for (const endpoint of ['claims','settlements'] as const) {
    const size = endpoint === 'claims' ? 50 : 500;
    let finished = false;
    for (let page = 0; page < 5; page++) {
      const result = pages(await getJson(config, endpoint, start, end, page, request),page,size);
      for (const raw of result.content) {
        const row = obj(raw);
        if (endpoint === 'claims') {
          const id = row.claimId ?? row.id;
          if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id) || !Array.isArray(row.items) || row.items.length > 100) throw Error('PROVIDER_SCHEMA');
          const statuses = row.items.flatMap(item => {
            const lines = obj(item).claimItems;
            if (!Array.isArray(lines) || lines.length > 100) throw Error('PROVIDER_SCHEMA');
            return lines.map(line => { const status = obj(obj(line).claimItemStatus).name; if (typeof status !== 'string' || !/^[A-Za-z]{3,40}$/.test(status)) throw Error('PROVIDER_SCHEMA'); return status; });
          });
          claims.push({ seller_id:config.sellerId, environment:config.environment, claim_id:id, order_number:digits(row.orderNumber)!, original_package_id:digits(row.orderOutboundPackageId,true), claim_date:timestamp(row.claimDate), modified_at:timestamp(row.lastModifiedDate), statuses:[...new Set(statuses.length ? statuses : ['Unknown'])].sort() });
        } else {
          const id = row.id;
          if ((typeof id !== 'string' && typeof id !== 'number') || String(id).length > 80) throw Error('PROVIDER_SCHEMA');
          returns.push({ seller_id:config.sellerId, environment:config.environment, transaction_id:String(id), order_number:digits(row.orderNumber)!, package_id:digits(row.shipmentPackageId,true), transaction_at:new Date(timestamp(row.transactionDate)).toISOString(), debt:money(row.debt)!, credit:money(row.credit)!, commission_amount:money(row.commissionAmount,true), seller_revenue:money(row.sellerRevenue,true) });
        }
      }
      if (result.done) { finished = true; break; }
    }
    if (!finished) throw Error('PROVIDER_CAPACITY');
  }
  return { claims, returns };
}

export function requiredFinanceWindows(start: number, end: number) {
  const result: number[] = [];
  for (let at = Math.floor(start / FINANCE_WINDOW_MS) * FINANCE_WINDOW_MS; at <= end; at += FINANCE_WINDOW_MS) result.push(at);
  return result;
}
export function financeCoverage(start: number, end: number, windows: FinanceWindow[], now: number) {
  const byStart = new Map(windows.map(w => [Number(w.starts_at),w]));
  return requiredFinanceWindows(start,end).every(at => {
    const row = byStart.get(at);
    return row && Number(row.ends_at) === at + FINANCE_WINDOW_MS && Number.isFinite(Date.parse(row.synced_at)) && (at < now - 2 * FINANCE_WINDOW_MS || Date.parse(row.synced_at) >= now - FINANCE_FRESH_MS);
  });
}
export function nextFinanceWindow(windows: FinanceWindow[], now: number): number | null {
  const existing = new Map(windows.map(w => [Number(w.starts_at),w]));
  const required = requiredFinanceWindows(now - FINANCE_HISTORY_MS,now);
  for (const at of required) if (!existing.has(at)) return at;
  for (const at of required.slice(-2)) if (Date.parse(existing.get(at)!.synced_at) < now - FINANCE_FRESH_MS) return at;
  return null;
}
export function claimBlocksProfit(statuses: string[]) {
  return statuses.some(status => status !== 'Cancelled' && status !== 'Rejected');
}
export function returnHoldOrders(claims: { order_number:string; statuses:string[] }[], returns: { order_number:string }[]) {
  // A split package is held at order level until line-level refund allocation is reconciled.
  return new Set([...claims.filter(c=>claimBlocksProfit(c.statuses)).map(c=>c.order_number),...returns.map(r=>r.order_number)]);
}
