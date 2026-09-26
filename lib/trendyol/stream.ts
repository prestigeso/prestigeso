import { projectPackages, validatePackageQuery, type TrendyolConfig } from './packages.ts';
import { limitedJson } from '../http/limitedJson.ts';
import {projectBuyers} from './buyers.ts';
export type StreamQuery = { start: number; end: number; cursor: string | null };
export function projectStream(body: unknown, cursor: string | null) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('STREAM_SCHEMA');
  const r = body as Record<string, unknown>;
  if (typeof r.hasMore !== 'boolean' || !Array.isArray(r.content) || r.content.length > 50) throw new Error('STREAM_SCHEMA');
  if (r.hasMore && (typeof r.nextCursor !== 'string' || !r.nextCursor || r.nextCursor.length > 4096 || r.nextCursor === cursor || !r.content.length)) throw new Error('STREAM_CURSOR');
  const packages = projectPackages({ content: r.content, totalElements: r.content.length, page: 0, totalPages: 1 }, 0).packages.map((p, i) => {
    const modified = (r.content as Record<string, unknown>[])[i].lastModifiedDate;
    if (!Number.isSafeInteger(modified) || Number(modified) < 0 || Number(modified) > 8640000000000000) throw new Error('STREAM_SCHEMA');
    // Persist only the explicit operational projection, never raw provider PII/identity fields.
    return { ...p, schemaVersion: 2, modifiedAt: Number(modified) };
  });
  return { packages, nextCursor: r.hasMore ? r.nextCursor as string : null, hasMore: r.hasMore };
}
export async function fetchTrendyolStream(config: TrendyolConfig & {buyerSecret?:string}, q: StreamQuery, request: typeof fetch = fetch) {
  validatePackageQuery({ ...q, page: 0 });
  if (!/^[1-9][0-9]{0,15}$/.test(config.sellerId) || !config.apiKey || !config.apiSecret || /[\r\n:]/.test(config.apiKey) || /[\r\n]/.test(config.apiSecret) || !['stage','production'].includes(config.environment)) throw new Error('CONFIGURATION_REQUIRED');
  if (q.cursor !== null && (typeof q.cursor !== 'string' || !q.cursor || q.cursor.length > 4096)) throw new Error('STREAM_CURSOR');
  const host = config.environment === 'production' ? 'apigw.trendyol.com' : 'stageapigw.trendyol.com';
  const url = new URL(`https://${host}/integration/order/sellers/${config.sellerId}/orders/stream`);
  url.search = new URLSearchParams({ size:'50', lastModifiedStartDate:String(q.start), lastModifiedEndDate:String(q.end), ...(q.cursor ? { nextCursor:q.cursor } : {}) }).toString();
  const r = await request(url, { method:'GET', redirect:'error', cache:'no-store', signal:AbortSignal.timeout(12000), headers:{ Authorization:`Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`, 'User-Agent':`${config.sellerId} - SelfIntegration`, Accept:'application/json' } });
  if (!r.ok) throw new Error(r.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_UNAVAILABLE');
  const data = await limitedJson(new Request('https://response.invalid', { method:'POST', headers:r.headers, body:r.body, duplex:'half' } as RequestInit), 2 * 1024 * 1024);
  return {...projectStream(data, q.cursor), buyers:config.buyerSecret?projectBuyers(data,config.buyerSecret,config.sellerId,config.environment):null};
}
