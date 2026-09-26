import test from 'node:test';
import assert from 'node:assert/strict';
import { claimBlocksProfit, fetchFinanceWindow, financeCoverage, returnHoldOrders, nextFinanceWindow, requiredFinanceWindows, FINANCE_WINDOW_MS } from '../lib/trendyol/finance.ts';
const config = { sellerId:'123',apiKey:'key',apiSecret:'secret',environment:'stage' as const };
const start = 1790000000000,end=start+FINANCE_WINDOW_MS;
test('claims and return settlements project only finance-safe fields from bounded GETs',async()=>{
 const paths:string[]=[];
 const request:typeof fetch = async(input,init)=>{
  const url = new URL(String(input));paths.push(url.pathname);
  assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');assert.equal(init?.cache,'no-store');
  const content=url.pathname.endsWith('/claims') ? [{claimId:'00000000-0000-4000-8000-000000000001',orderNumber:'12345',claimDate:start+1,lastModifiedDate:start+2,orderOutboundPackageId:42,customerFirstName:'Private',items:[{claimItems:[{claimItemStatus:{name:'Accepted'},customerNote:'Private'}]}]}] : [{id:'781',orderNumber:'12345',shipmentPackageId:42,transactionDate:start+3,debt:800,credit:0,commissionAmount:180,sellerRevenue:620,customerFirstName:'Private'}];
  return new Response(JSON.stringify({page:0,totalPages:1,totalElements:1,content}),{status:200});
 };
 const r=await fetchFinanceWindow(config,start,end,request);
 assert.equal(r.claims[0].order_number,'12345');assert.deepEqual(r.claims[0].statuses,['Accepted']);
 assert.equal(r.returns[0].debt,800);assert.equal(JSON.stringify(r).includes('Private'),false);
 assert.deepEqual(paths,[`/integration/order/sellers/123/claims`,`/integration/finance/che/sellers/123/settlements`]);
});
test('unknown and active claims hold profit; rejected/cancelled do not',()=>{
 for(const status of ['Accepted','Created','WaitingInAction','InAnalysis','Unknown']) assert.equal(claimBlocksProfit([status]),true);
 assert.equal(claimBlocksProfit(['Rejected','Cancelled']),false);
 assert.equal(claimBlocksProfit(['Rejected','Accepted']),true);
 assert.equal(returnHoldOrders([{order_number:'0728',statuses:['Accepted']}],[]).has('0728'),true);
 assert.equal(returnHoldOrders([{order_number:'2960',statuses:['Cancelled']}],[{order_number:'2960'}]).has('2960'),true);
 assert.equal(returnHoldOrders([{order_number:'2960',statuses:['Cancelled']}],[]).has('2960'),false);
});
test('coverage requires every interval and refreshes recent windows',()=>{
 const now=Date.now(),starts=requiredFinanceWindows(now-20*86400000,now);
 const rows=starts.map(at=>({starts_at:at,ends_at:at+FINANCE_WINDOW_MS,synced_at:new Date(now).toISOString()}));
 assert.equal(financeCoverage(now-20*86400000,now,rows,now),true);
 assert.equal(financeCoverage(now-20*86400000,now,rows.slice(1),now),false);
 assert.equal(nextFinanceWindow(rows,now),requiredFinanceWindows(now-89*86400000,now)[0]);
 const all=requiredFinanceWindows(now-89*86400000,now).map(at=>({starts_at:at,ends_at:at+FINANCE_WINDOW_MS,synced_at:new Date(now).toISOString()}));
 assert.equal(nextFinanceWindow(all,now),null);
 all.at(-1)!.synced_at=new Date(now-7*3600000).toISOString();
 assert.equal(nextFinanceWindow(all,now),all.at(-1)!.starts_at);
});
test('malformed provider data and overflow never mark finance window complete',async()=>{
 const bad:typeof fetch=async()=>new Response(JSON.stringify({page:0,totalPages:6,totalElements:3000,content:[]}),{status:200});
 await assert.rejects(()=>fetchFinanceWindow(config,start,end,bad),/PROVIDER_CAPACITY/);
 const auth:typeof fetch=async()=>new Response('',{status:401});
 await assert.rejects(()=>fetchFinanceWindow(config,start,end,auth),/PROVIDER_AUTH/);
});
