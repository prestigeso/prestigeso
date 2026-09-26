import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeShippingSettings,calculateShippingFee,calculateRemainingForFreeShipping} from '../lib/checkout/checkoutShipping.ts';

test('shipping: legacy zero threshold retains paid shipping',()=>{
 const settings=normalizeShippingSettings({shipping_fee:70,free_shipping_threshold:0,shipping_enabled:true});
 assert.equal(calculateShippingFee(settings,1500),70);
 assert.equal(settings.rules_version,undefined);
});
test('shipping: versioned blank threshold is always paid, zero is always free',()=>{
 const base={shipping_fee:70,shipping_enabled:true,rules_version:2};
 for(const subtotal of [0,100,1500]){
  assert.equal(calculateShippingFee(normalizeShippingSettings({...base,free_shipping_threshold:null}),subtotal),70);
  assert.equal(calculateShippingFee(normalizeShippingSettings({...base,free_shipping_threshold:0}),subtotal),0);
 }
});
test('shipping: exact threshold, discount-adjusted subtotal and disabled shipping',()=>{
 const settings=normalizeShippingSettings({shipping_fee:70,free_shipping_threshold:1000,shipping_enabled:true,rules_version:2});
 assert.equal(calculateShippingFee(settings,999),70);
 assert.equal(calculateRemainingForFreeShipping(settings,999,70),1);
 assert.equal(calculateShippingFee(settings,1000),0);
 assert.equal(calculateShippingFee({...settings,shipping_enabled:false},500),0);
});
