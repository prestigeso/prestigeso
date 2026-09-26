import test from 'node:test';
import assert from 'node:assert/strict';
import {projectStream,fetchTrendyolStream} from '../lib/trendyol/stream.ts';
import {inspectSearchUrl,validateInspectionUrl} from '../lib/integrations/googleSearch.ts';
import {signMarketing,verifyMarketing} from '../lib/marketing/identity.ts';
import {prepareMetaPurchase} from '../lib/marketing/purchase.ts';
const item={shipmentPackageId:1,orderNumber:10,shipmentPackageStatus:'Created',packageTotalPrice:100,currencyCode:'TRY',orderDate:1,lastModifiedDate:2,lines:[{stockCode:'Q1',productName:'Product',quantity:1}],customerEmail:'private@example.invalid'};
test('Trendyol stream projects private data out and enforces cursor progress',()=>{
 const protectedResult=projectStream({hasMore:false,content:[{...item,shipmentAddress:{fullName:'PRIVATE-NAME',phone:'PRIVATE-PHONE'},cargoTrackingLink:'https://tracking.trendyol.com/?id=PRIVATE-LINK'}]},null);
 assert.equal(protectedResult.packages[0].deliveryAddress?.name,'PRIVATE-NAME');
 assert.equal(protectedResult.packages[0].schemaVersion,2);
 assert.doesNotMatch(JSON.stringify(protectedResult),/customerEmail|taxNumber|customerId/);
 const r=projectStream({hasMore:true,nextCursor:'opaque',content:[item]},null);assert.equal(r.packages[0].modifiedAt,2);assert.ok(!JSON.stringify(r).includes('private@example'));
 for(const body of [{hasMore:true,nextCursor:'old',content:[item]},{hasMore:true,nextCursor:'new',content:[]},{hasMore:true,content:[item]},{hasMore:false,content:[item,item]},{hasMore:false,content:[{...item,lastModifiedDate:null}]}])assert.throws(()=>projectStream(body,'old'));
});
test('Trendyol stream uses fixed host and preserves opaque cursor exactly',async()=>{
 await fetchTrendyolStream({sellerId:'123',apiKey:'test',apiSecret:'test',environment:'stage'},{start:1,end:2,cursor:'a+/='},async(url,init)=>{
  const u=new URL(String(url));assert.equal(u.hostname,'stageapigw.trendyol.com');assert.equal(u.pathname,'/integration/order/sellers/123/orders/stream');assert.equal(u.searchParams.get('nextCursor'),'a+/=');assert.equal(init?.method,'GET');assert.equal(init?.redirect,'error');return Response.json({hasMore:false,content:[item]});
 });
});
test('Google inspection rejects SSRF and encoded private URLs before requesting',()=>{
 assert.equal(validateInspectionUrl('https://www.prestigeso.com.tr/product/1'),'https://www.prestigeso.com.tr/product/1');
 for(const url of ['http://localhost','https://evil.test','https://www.prestigeso.com.tr.evil.test','https://www.prestigeso.com.tr/profile','https://www.prestigeso.com.tr/%61dmin','https://www.prestigeso.com.tr/%252fadmin','https://www.prestigeso.com.tr/?token=x','https://www.prestigeso.com.tr/odeme/basarili'])assert.throws(()=>validateInspectionUrl(url));
});
test('Google inspection reports indexed snapshot, not live crawl',async()=>{
 let n=0;const result=await inspectSearchUrl({clientId:'x',clientSecret:'x',refreshToken:'x'},'https://www.prestigeso.com.tr/',async(url)=>{if(++n===1)return Response.json({access_token:'x',token_type:'Bearer'});assert.equal(String(url),'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect');return Response.json({inspectionResult:{indexStatusResult:{verdict:'PASS',googleCanonical:'https://www.prestigeso.com.tr/'}}});});
 assert.equal(result.indexedSnapshotOnly,true);assert.equal(result.status.verdict,'PASS');assert.equal(result.status.lastCrawlTime,null);
});
test('Marketing identity is signed, domain-separated and expires',()=>{
 const id='12345678-1234-4123-8123-123456789012',key='x'.repeat(32),now=Date.now();const signed=signMarketing(id,key,now);
 assert.equal(verifyMarketing(signed,key,now),id);assert.equal(verifyMarketing(`${signed.slice(0,-1)}z`,key,now),null);assert.equal(verifyMarketing(signed,key,now+31*86400000),null);assert.equal(verifyMarketing(signed,'y'.repeat(32),now),null);
});
test('Meta preparation shares event ID, redacts extras, blocks withdrawn or stale purchases',()=>{
 const now=Date.now(),row={eventId:'12345678-1234-4123-8123-123456789012',subjectId:'opaque',status:'held',allowed:true,payload:{event_name:'Purchase',event_time:Math.floor(now/1000),action_source:'website',email:'private@example.invalid',custom_data:{currency:'TRY',value:100,content_ids:['1']}}};
 const r=prepareMetaPurchase(row,now);assert.equal(r.server.event_id,r.browser.options.eventID);assert.equal(r.dispatchEnabled,false);assert.ok(!JSON.stringify(r).includes('private@example'));
 assert.throws(()=>prepareMetaPurchase({...row,allowed:false},now));assert.throws(()=>prepareMetaPurchase({...row,status:'cancelled'},now));assert.throws(()=>prepareMetaPurchase(row,now+8*86400000));
});
