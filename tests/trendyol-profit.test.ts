import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTrendyolProfitPackage } from '../lib/finance/trendyol-profit.ts';
import { buildProfitReport } from '../lib/finance/profit-report.ts';

const settings = { vatBps:2000,commissionBps:1700,shippingMinor:13000,packagingMinor:3000,logisticsMinor:0,giftThresholdMinor:0,giftCostMinor:0,hiddenBps:1000,advertisingBps:0 };
const profile = { platform:'trendyol' as const,version:1,effective_from:'2026-01-01',settings };
const original = { status:'Delivered',currency:'TRY',amount:650,grossAmount:700,discount:50,lines:[{status:'Delivered',cancelReason:null}] };

test('discounted Trendyol package uses final paid amount once and flags missing funding split',()=>{
  const classification = classifyTrendyolProfitPackage(original,false);
  assert.equal(classification.eligible,true);
  assert.equal(classification.discountFundingUnknown,true);
  const report = buildProfitReport([{id:'discounted',platform:'trendyol',at:'2026-09-01',amount:original.amount,goods:15000,...classification}],[profile]);
  assert.equal(report.included,1);
  assert.equal(report.excluded,0);
  assert.equal(report.rows[0].result?.saleMinor,65000);
  assert.equal(report.rows[0].result?.deductions.commission,11050);
  assert.equal(report.rows[0].discountFundingUnknown,true);
});

test('returns, cancellations and contradictory discount totals remain outside profit',()=>{
  const returned = classifyTrendyolProfitPackage(original,true);
  assert.equal(returned.eligible,false);
  assert.match(returned.exclusion!,/İade/);
  assert.equal(classifyTrendyolProfitPackage({...original,status:'Cancelled'},false).exclusion,'İptal edilen paket');
  assert.equal(classifyTrendyolProfitPackage({...original,discount:49},false).eligible,false);
  assert.equal(classifyTrendyolProfitPackage({...original,discount:null},false).eligible,false);
  assert.equal(classifyTrendyolProfitPackage({...original,amount:700,discount:0},false).discountFundingUnknown,false);
});
