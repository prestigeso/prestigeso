import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectBuyers} from '../lib/trendyol/buyers.ts';
const secret='synthetic-buyer-test-key-only-000000000000';
test('buyer identity is stable, domain separated and raw identity never leaves projection',()=>{
 const body={content:[{customerId:123456,shipmentPackageStatus:'Delivered',orderDate:1700000000000,customerEmail:'private@example.invalid'}]};
 const a=projectBuyers(body,secret,'123','production');
 assert.equal(a[0].buyer_key.length,64);
 assert.deepEqual(a,projectBuyers(body,secret,'123','production'));
 assert.notEqual(a[0].buyer_key,projectBuyers(body,secret,'124','production')[0].buyer_key);
 assert.notEqual(a[0].buyer_key,projectBuyers(body,secret,'123','stage')[0].buyer_key);
 assert.deepEqual(Object.keys(a[0]),['buyer_key','first_order_at']);
 assert.equal(JSON.stringify(a).includes('private@example'),false);
});
test('cancelled, awaiting, invalid identity and missing identity are never invented as buyers',()=>{
 const content=['Cancelled','Awaiting','UnPacked'].map(status=>({customerId:1,shipmentPackageStatus:status,orderDate:1700000000000}));
 assert.deepEqual(projectBuyers({content:[...content,{shipmentPackageStatus:'Delivered',orderDate:1700000000000}]},secret,'123','production'),[]);
 assert.throws(()=>projectBuyers({content:[]},'short','123','production'));
});
