import { limitedJson } from '../http/limitedJson.ts';
export const SEARCH_PROPERTY = 'sc-domain:prestigeso.com.tr';
export type SearchQuery = { startDate: string; endDate: string; dimension: 'query' | 'page' | 'device'; startRow: number };
export type GoogleCredentials = { clientId: string; clientSecret: string; refreshToken: string };
export function validateSearchQuery(q: SearchQuery) {
  const date = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
  if (!date(q.startDate) || !date(q.endDate) || q.startDate > q.endDate || Date.parse(q.endDate) - Date.parse(q.startDate) > 92 * 86400000 || !['query', 'page', 'device'].includes(q.dimension) || !Number.isSafeInteger(q.startRow) || q.startRow < 0 || q.startRow > 24900 || q.startRow % 100 !== 0) throw new Error('INVALID_QUERY');
}
async function googleJson(url: string, init: RequestInit, request: typeof fetch) {
  let response: Response;
  try { response = await request(url, { ...init, signal: AbortSignal.timeout(12000), redirect: 'error', cache: 'no-store' }); } catch { throw new Error('GOOGLE_UNAVAILABLE'); }
  if (response.status === 401 || (response.status === 400 && url === 'https://oauth2.googleapis.com/token')) throw new Error('GOOGLE_REAUTHORIZE');
  if (response.status === 403) throw new Error('GOOGLE_PERMISSION');
  if (response.status === 400) throw new Error('GOOGLE_AUTH_OR_QUERY');
  if (response.status === 429) throw new Error('GOOGLE_RATE_LIMIT');
  if (!response.ok) throw new Error('GOOGLE_UNAVAILABLE');
  // Reuse bounded streaming JSON reader; never log upstream response/token data.
  const result = await limitedJson(new Request('https://response.invalid', { method: 'POST', headers: response.headers, body: response.body, duplex: 'half' } as RequestInit), 512 * 1024);
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('GOOGLE_SCHEMA');
  return result as Record<string, unknown>;
}
export async function fetchSearchReport(credentials: GoogleCredentials, query: SearchQuery, request: typeof fetch = fetch) {
  validateSearchQuery(query);
  const access = await googleAccess(credentials, request);
  const result = await googleJson(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SEARCH_PROPERTY)}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: query.startDate, endDate: query.endDate, dimensions: [query.dimension], type: 'web', dataState: 'final', rowLimit: 100, startRow: query.startRow }) }, request);
  return projectSearchReport(result, query);
}
async function googleAccess(credentials:GoogleCredentials,request:typeof fetch){
  if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) throw new Error('GOOGLE_CONFIGURATION');
  const token = await googleJson('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: credentials.refreshToken, grant_type: 'refresh_token' }).toString() }, request);
  if (typeof token.access_token !== 'string' || !token.access_token || token.token_type !== 'Bearer') throw new Error('GOOGLE_SCHEMA');
  return token.access_token;
}

export async function checkSearchConnection(credentials: GoogleCredentials, request: typeof fetch = fetch) {
  const access = await googleAccess(credentials, request);
  const site = await googleJson(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SEARCH_PROPERTY)}`, { method: 'GET', headers: { Authorization: `Bearer ${access}` } }, request);
  if (site.siteUrl !== SEARCH_PROPERTY || !['siteOwner', 'siteFullUser', 'siteRestrictedUser'].includes(String(site.permissionLevel))) throw new Error('GOOGLE_PERMISSION');
  return { connected: true, property: SEARCH_PROPERTY, permission: String(site.permissionLevel), checkedAt: new Date().toISOString(), readOnly: true };
}
function projectSearchReport(result:Record<string,unknown>,query:SearchQuery){
  if (result.rows !== undefined && !Array.isArray(result.rows)) throw new Error('GOOGLE_SCHEMA');
  const rows = (result.rows || []) as Record<string, unknown>[];
  if (rows.length > 100) throw new Error('GOOGLE_SCHEMA');
  const seen = new Set<string>();
  const projected = rows.map(r => {
    if (!r || !Array.isArray(r.keys) || r.keys.length !== 1 || typeof r.keys[0] !== 'string' || r.keys[0].length > 4096 || seen.has(r.keys[0])) throw new Error('GOOGLE_SCHEMA');
    seen.add(r.keys[0]);
    for (const key of ['clicks', 'impressions', 'ctr', 'position']) if (typeof r[key] !== 'number' || !Number.isFinite(r[key]) || Number(r[key]) < 0) throw new Error('GOOGLE_SCHEMA');
    if (Number(r.ctr) > 1 || Number(r.clicks) > Number(r.impressions)) throw new Error('GOOGLE_SCHEMA');
    return { key: r.keys[0], clicks: r.clicks as number, impressions: r.impressions as number, ctr: r.ctr as number, position: r.position as number };
  });
  return { property: SEARCH_PROPERTY, query, rows: projected, timeZone: 'America/Los_Angeles', dataState: 'final', topRowsOnly: true, hasNext: rows.length === 100 && query.startRow < 24900, capped: rows.length === 100 && query.startRow === 24900, fetchedAt: new Date().toISOString() };
}

export function validateInspectionUrl(value:string){
 const u=new URL(value);
 if(u.protocol!=='https:' || !['prestigeso.com.tr','www.prestigeso.com.tr'].includes(u.hostname) || u.port || u.username || u.password || u.hash || value.length>2048)throw new Error('INVALID_INSPECTION_URL');
 // Private URLs often contain order proof tokens; never send them to Google.
 let path=u.pathname;for(let i=0;i<3&&path.includes('%');i++)path=decodeURIComponent(path);
 path=path.replace(/\\/g,'/').replace(/\/+/g,'/');
 path=new URL(path,'https://www.prestigeso.com.tr').pathname;
 if(path.includes('%') || /[\x00-\x1f]/.test(path) || /^\/(admin|api|profile|checkout|login|odeme|siparis-takip|update-password)(\/|$)/i.test(path) || [...u.searchParams.keys()].some(k=>!['category','page'].includes(k)))throw new Error('PRIVATE_INSPECTION_URL');
 return u.href;
}
export async function inspectSearchUrl(credentials:GoogleCredentials,url:string,request:typeof fetch=fetch){
 const inspectionUrl=validateInspectionUrl(url),access=await googleAccess(credentials,request);
 const result=await googleJson('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify({inspectionUrl,siteUrl:SEARCH_PROPERTY,languageCode:'tr-TR'})},request);
 const inspection=result.inspectionResult as Record<string,unknown> | undefined;
 const status=inspection?.indexStatusResult as Record<string,unknown> | undefined;
 if(!status || typeof status!=='object' || Array.isArray(status))throw new Error('GOOGLE_SCHEMA');
 const fields=['verdict','coverageState','robotsTxtState','indexingState','pageFetchState','lastCrawlTime','googleCanonical','userCanonical','crawledAs'];
 const projected:Record<string,string|null>={};for(const field of fields){const v=status[field];if(v!==undefined && (typeof v!=='string'||v.length>4096))throw new Error('GOOGLE_SCHEMA');projected[field]=v as string || null;}
 return {inspectionUrl,indexedSnapshotOnly:true,fetchedAt:new Date().toISOString(),status:projected};
}
