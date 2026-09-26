/** Read-only diagnostic. Never prints credentials, customer data, or raw provider responses. */
import { createClient } from '@supabase/supabase-js';

const required = ['TRENDYOL_SELLER_ID', 'TRENDYOL_API_KEY', 'TRENDYOL_API_SECRET', 'TRENDYOL_ENVIRONMENT', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
if (required.some(key => !process.env[key])) throw new Error('Missing configuration');
const { TRENDYOL_SELLER_ID: seller, TRENDYOL_API_KEY: key, TRENDYOL_API_SECRET: secret, TRENDYOL_ENVIRONMENT: environment } = process.env;
if (!['stage', 'production'].includes(environment)) throw new Error('Invalid environment');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const end = Date.now();
const start = end - 28 * 86400000;
const claims = [];
for (let windowStart = start; windowStart < end; windowStart += 14 * 86400000) {
  const windowEnd = Math.min(end, windowStart + 14 * 86400000);
  for (let page = 0; page < 20; page++) {
    const url = new URL(`https://${environment === 'production' ? 'apigw.trendyol.com' : 'stageapigw.trendyol.com'}/integration/order/sellers/${seller}/claims`);
    url.search = new URLSearchParams({ startDate: String(windowStart), endDate: String(windowEnd), page: String(page), size: '50' }).toString();
    const response = await fetch(url, { method: 'GET', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'User-Agent': `${seller} - SelfIntegration`, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Claims request failed: HTTP ${response.status}`);
    const body = await response.json();
    if (!Number.isSafeInteger(body.totalPages) || body.totalPages > 20 || (!Array.isArray(body.content) && !(body.content === null && body.totalElements === 0))) throw new Error(`Unexpected claims response shape: content=${typeof body.content}; totalPages=${typeof body.totalPages}; totalElements=${body.totalElements}`);
    claims.push(...(body.content || []));
    if (page + 1 >= body.totalPages) break;
  }
}
const settlementReturns = [];
for (let windowStart = start; windowStart < end; windowStart += 14 * 86400000) {
  const windowEnd = Math.min(end, windowStart + 14 * 86400000);
  for (let page = 0; page < 20; page++) {
    const url = new URL(`https://${environment === 'production' ? 'apigw.trendyol.com' : 'stageapigw.trendyol.com'}/integration/finance/che/sellers/${seller}/settlements`);
    url.search = new URLSearchParams({ startDate: String(windowStart), endDate: String(windowEnd), transactionType: 'Return', page: String(page), size: '500' }).toString();
    const response = await fetch(url, { method: 'GET', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`, 'User-Agent': `${seller} - SelfIntegration`, Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Settlement request failed: HTTP ${response.status}`);
    const body = await response.json();
    if (!Number.isSafeInteger(body.totalPages) || body.totalPages > 20 || (!Array.isArray(body.content) && !(body.content === null && body.totalElements === 0))) throw new Error('Unexpected settlement response');
    settlementReturns.push(...(body.content || []));
    if (page + 1 >= body.totalPages) break;
  }
}
const orderNumbers = [...new Set(claims.map(c => String(c.orderNumber || '')).filter(Boolean))];
let packages = [];
for (const orderNumber of orderNumbers) {
  const result = await db.from('trendyol_package_mirror').select('package_id,payload').eq('seller_id', seller).eq('environment', environment).eq('payload->>orderNumber', orderNumber).limit(20);
  if (result.error) throw new Error('Mirror lookup failed');
  packages.push(...result.data);
}
const profiles = await db.from('profit_profiles').select('platform,version,effective_from').limit(100);
if (profiles.error) throw new Error('Profit migration/profile read failed');
const packageCosts = new Map();
for (const pkg of packages) {
  let matching = 0;
  for (const line of pkg.payload?.lines || []) {
    const cost = await db.from('phase2_record_history').select('version').eq('kind', 'product_cost').eq('resource_key', line.sku).lte('recorded_at', new Date(pkg.payload.orderDate).toISOString()).limit(1);
    if (cost.error) throw new Error('Historical cost lookup failed');
    if (cost.data.length) matching++;
  }
  packageCosts.set(pkg.package_id, matching);
}
console.log(JSON.stringify({ window: { start: new Date(start).toISOString(), end: new Date(end).toISOString() }, claimsCount: claims.length, settlementReturns: settlementReturns.map(r => ({ orderSuffix: String(r.orderNumber || '').slice(-4), transactionDate: r.transactionDate ? new Date(r.transactionDate).toISOString() : null, debt: r.debt, credit: r.credit, commissionAmount: r.commissionAmount, sellerRevenue: r.sellerRevenue })), profiles: profiles.data.map(p => ({ platform: p.platform, version: p.version, effectiveFrom: p.effective_from })), claims: claims.map(c => ({ orderSuffix: String(c.orderNumber || '').slice(-4), claimDate: c.claimDate ? new Date(c.claimDate).toISOString() : null, modifiedDate: c.lastModifiedDate ? new Date(c.lastModifiedDate).toISOString() : null, statuses: [...new Set((c.items || []).flatMap(i => (i.claimItems || []).map(x => x.claimItemStatus?.name || 'unknown')))], claimedLines: (c.items || []).reduce((n, i) => n + (i.claimItems || []).length, 0), claimedLinePrices: (c.items || []).map(i => i.orderLine?.price ?? null), mirroredPackages: packages.filter(p => p.payload?.orderNumber === String(c.orderNumber)).map(p => ({ packageSuffix: p.package_id.slice(-4), status: p.payload?.status, orderDate: p.payload?.orderDate ? new Date(p.payload.orderDate).toISOString() : null, discount: p.payload?.discount, amount: p.payload?.amount, lineCount: p.payload?.lines?.length, historicallyCostedLines: packageCosts.get(p.package_id), eligibleByCurrentStatus: ['Created','Picking','Invoiced','Shipped','Delivered','AtCollectionPoint'].includes(p.payload?.status) && p.payload?.discount === 0 })) })) }, null, 2));
