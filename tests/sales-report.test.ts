import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildSalesReport} from '../lib/finance/sales-report.ts';
const now=Date.parse('2026-09-24T12:00:00Z');
const pkg=(id:string,status='Delivered',orderNumber=id,age=40,amount=100)=>({packageId:id,orderNumber,status,orderDate:now-age*86400000,amount,currency:'TRY'});
test('90 and 365 day sales include archived marketplace history and exclude invalidated packages',()=>{
 for(const days of [90,365]){
 const report=buildSalesReport([{id:1,payment_status:'paid',paid_at:new Date(now-40*86400000).toISOString(),created_at:new Date(now-40*86400000).toISOString(),total_amount:200,refunded_amount:20}],
 [pkg('1','Delivered','A'),pkg('2','Picking','A'),pkg('1','Delivered','A'),pkg('3','UnPacked'),pkg('4','Cancelled'),pkg('5','Returned'),pkg('6','Awaiting'),pkg('7','UnDelivered')],days,now);
 assert.equal(report.finance.gross,400);assert.equal(report.finance.orders,2);assert.equal(report.finance.refunds,20);
 assert.equal(report.channels.trendyol.packages,2);
 assert.equal(report.series.reduce((n,x)=>n+x.gross,0),400);
 assert.equal(report.series.reduce((n,x)=>n+x.orders,0),2);
 }
});
test('period bounds, unsupported currency and minor-unit sums are safe',()=>{
 const report=buildSalesReport([], [pkg('1','Created','A',10,0.1),pkg('2','Shipped','B',10,0.2),pkg('3','Delivered','C',100),{...pkg('4'),currency:'USD'}],90,now);
 assert.equal(report.finance.gross,0.3);assert.equal(report.finance.orders,2);
 assert.equal(buildSalesReport([],[pkg('1')],30,now).finance.gross,0);
 assert.equal(buildSalesReport([],[pkg('1','Delivered','A',100)],365,now).finance.gross,100);
});
