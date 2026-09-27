import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfit, profileAt, snapshotGoods, validateProfitSettings } from '../lib/finance/profit.ts';
import { buildProfitReport, historicalGoods } from '../lib/finance/profit-report.ts';
const settings = { vatBps:2000,commissionBps:1500,shippingMinor:13000,packagingMinor:0,logisticsMinor:0,giftThresholdMinor:0,giftCostMinor:0,hiddenBps:1000,advertisingBps:0 };
test('VAT-inclusive example: 700 minus seller coupon 50 gives 49.17, not 22.50',()=>{
 const r=calculateProfit(65000,20000,settings);
 assert.equal(r.deductions.vat,10833);assert.equal(r.deductions.commission,9750);assert.equal(r.deductions.hidden,6500);assert.equal(r.profitMinor,4917);
});
test('unknown cost is not zero; zero is explicit',()=>{
 assert.equal(calculateProfit(65000,null,settings).profitMinor,null);
 assert.notEqual(calculateProfit(65000,0,settings).profitMinor,null);
});
test('negative profit and zero revenue are supported',()=>{
 assert.equal(calculateProfit(0,100,settings).margin,null);
 assert.equal(calculateProfit(0,100,settings).profitMinor,-13100);
});
test('ZIP cost categories are fixed or percentage with no invented defaults',()=>{
 const configured={...settings,logisticsMinor:2000,packagingMinor:1000,giftThresholdMinor:50000,giftCostMinor:2250};
 const below=calculateProfit(49999,20000,configured),above=calculateProfit(50000,20000,configured);
 assert.equal(below.deductions.logistics,2000);assert.equal(below.deductions.packaging,1000);assert.equal(below.deductions.gift,0);
 assert.equal(above.deductions.gift,2250);
 assert.equal(above.profitMinor,calculateProfit(50000,20000,{...configured,giftCostMinor:0,giftThresholdMinor:0}).profitMinor!-2250);
 assert.throws(()=>validateProfitSettings({...configured,giftThresholdMinor:0}));
});
test('invalid amounts, rates and extra settings rejected',()=>{
 for(const n of [-1,NaN,Infinity,0.5,1e15])assert.throws(()=>calculateProfit(n,0,settings));
 assert.throws(()=>validateProfitSettings({...settings,vatBps:10001}));
 assert.throws(()=>validateProfitSettings({...settings,shippingMinor:null}));
 assert.throws(()=>validateProfitSettings({...settings,extra:1}));
});
test('effective profile selection preserves prior settings and channel',()=>{
 const profiles=[{platform:'store' as const,version:1,effective_from:'2026-01-01',settings},{platform:'store' as const,version:2,effective_from:'2026-09-24',settings:{...settings,shippingMinor:15000}}];
 assert.equal(profileAt(profiles,'store','2026-09-23')?.version,1);assert.equal(profileAt(profiles,'store','2026-09-24')?.version,2);
 assert.equal(profileAt(profiles,'trendyol','2026-09-24'),null);assert.equal(profileAt(profiles,'store','2025-01-01'),null);
 const backdated={platform:'store' as const,version:3,effective_from:'2026-09-20',settings:{...settings,shippingMinor:17000}};
 assert.equal(profileAt([...profiles,backdated],'store','2026-09-19')?.version,1);
 assert.equal(profileAt([...profiles,backdated],'store','2026-09-21')?.version,3);
 assert.equal(profileAt([...profiles,backdated],'store','2026-09-25')?.version,3);
});
test('snapshot requires all quantities and inclusive TRY costs',()=>{
 const unitCost={amountMinor:20000,taxBasis:'inclusive',currency:'TRY'};
 assert.equal(snapshotGoods([{quantity:2,unitCost}]),40000);
 for(const lines of [[],[{quantity:0,unitCost}],[{quantity:1,unitCost:null}],[{quantity:1,unitCost:{...unitCost,taxBasis:'exclusive'}}]])assert.equal(snapshotGoods(lines),null);
});
test('Trendyol exact SKU uses historical cost, or labels later cost as a retrospective estimate',()=>{
 const h=[{kind:'product_cost',resource_key:'A',recorded_at:'2026-01-01',version:1,payload:{amountMinor:20000,taxBasis:'inclusive',currency:'TRY'}},{kind:'product_cost',resource_key:'A',recorded_at:'2026-10-01',version:2,payload:{amountMinor:30000,taxBasis:'inclusive',currency:'TRY'}}];
 const products=[{SKU:'A',barcode:'123'}];
 assert.deepEqual(historicalGoods([{sku:'A',quantity:2}],h,'2026-09-01',products),{amount:40000,currentCostEstimate:false});
 assert.deepEqual(historicalGoods([{sku:'A',quantity:2}],h,'2025-09-01',products),{amount:60000,currentCostEstimate:true});
 assert.deepEqual(historicalGoods([{sku:'B',quantity:2}],h,'2026-09-01',products),{amount:null,currentCostEstimate:false});
 assert.deepEqual(historicalGoods([{sku:'B',barcode:'123',quantity:2}],h,'2026-09-01',products),{amount:40000,currentCostEstimate:false});
 const mapped=[...h,{kind:'sku_mapping',resource_key:'TRENDYOL-OTHER',recorded_at:'2026-10-02',version:1,payload:{siteSku:'A'}}];
 assert.deepEqual(historicalGoods([{sku:'TRENDYOL-OTHER',quantity:2}],mapped,'2026-09-01',products),{amount:40000,currentCostEstimate:false});
});
test('report excludes refunds, missing profiles and costs from totals',()=>{
 const profile={platform:'store' as const,version:1,effective_from:'2026-01-01',settings};
 const sale={id:'1',platform:'store' as const,at:'2026-09-01',amount:650,eligible:true,goods:20000};
 const r=buildProfitReport([sale,{...sale,id:'2',eligible:false},{...sale,id:'3',goods:null},{...sale,id:'4',platform:'trendyol'}],[profile]);
 assert.equal(r.included,1);assert.equal(r.excluded,3);assert.equal(r.profitMinor,4917);
 assert.equal(buildProfitReport([],[]).profitMinor,null);
});
test('legacy six-field profiles never imply zero logistics or gift expense',()=>{
 const legacy={platform:'store' as const,version:1,effective_from:'2026-01-01',settings:{vatBps:2000,commissionBps:1500,shippingMinor:13000,packagingMinor:0,hiddenBps:1000,advertisingBps:0}};
 const report=buildProfitReport([{id:'1',platform:'store',at:'2026-09-25',amount:650,eligible:true,goods:20000}],[legacy as unknown as import('../lib/finance/profit.ts').ProfitProfile]);
 assert.equal(report.profitMinor,null);assert.match(report.rows[0].reason!,/eski gider ayarı eksik/);
});
