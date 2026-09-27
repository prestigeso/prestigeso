import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSiteSku } from '../lib/trendyol/product-match.ts';
import { returnState, visiblePackageStatus } from '../lib/trendyol/return-status.ts';

const products = [{ SKU:'Q312', barcode:'8691' }, { SKU:'Q126', barcode:'8692' }, { SKU:'Q999', barcode:'8693' }];
test('Trendyol SKU, barcode and explicit override resolve without fuzzy names', () => {
  assert.equal(resolveSiteSku({sku:'Q312'},products,new Map()),'Q312');
  assert.equal(resolveSiteSku({sku:'Q127',barcode:'8692'},products,new Map()),'Q126');
  assert.equal(resolveSiteSku({sku:'OTHER',barcode:'8692'},[...products,{SKU:'DUPLICATE',barcode:'8692'}],new Map()),null);
  assert.equal(resolveSiteSku({sku:'Q312',barcode:'8691'},products,new Map([['Q312','Q999']])), 'Q999');
  assert.equal(resolveSiteSku({sku:'Q127',barcode:'8692'},products,new Map([['Q127','DELETED']])), null);
});
test('settled refund overrides delivered package; rejected claim does not', () => {
  const claims=[{order_number:'1',statuses:['Accepted']},{order_number:'2',statuses:['Rejected']}];
  assert.equal(returnState('1',claims,[]),'requested');
  assert.equal(returnState('2',claims,[]),'none');
  assert.equal(returnState('1',claims,[{order_number:'1'}]),'refunded');
  assert.equal(visiblePackageStatus('Delivered','refunded'),'İade edildi');
  assert.equal(visiblePackageStatus('Delivered','requested'),'İade talebi');
});
