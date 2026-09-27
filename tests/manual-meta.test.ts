import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManualMeta, manualMetaEntry, manualMetaSpend, optionalManualMetaSpend, matchingManualMetaEntries } from '../lib/finance/manual-meta.ts';
const startDate='2026-09-01',key=`${startDate}:meta-12345678-1234-4123-8123-123456789012`;
const base={requestId:'22345678-1234-4123-8123-123456789012',key,expectedVersion:0,startDate,endDate:'2026-09-03',channel:'store',amount:'100,01',note:'Meta kampanyası'};
test('manual Meta interval validates dates, channel and exact minor units',()=>{
  const record=validateManualMeta(base);
  assert.equal(record.payload.amountMinor,10001);
  for (const patch of [{endDate:'2026-08-31'},{endDate:'2026-09-31'},{channel:'unknown'},{amount:''},{amount:'0.001'},{key:'2026-09-02:meta-12345678-1234-4123-8123-123456789012'},{note:'x'}]) assert.throws(()=>validateManualMeta({...base,...patch}));
});
test('daily allocation preserves cents and channel separation',()=>{
  const p=validateManualMeta(base).payload;
  const entry=manualMetaEntry({resource_key:key,version:1,payload:p});
  assert.ok(entry);
  const day=(d:string)=>Date.parse(`${d}T00:00:00+03:00`);
  const d1=manualMetaSpend([entry],day('2026-09-01'),day('2026-09-02'),'store');
  const d2=manualMetaSpend([entry],day('2026-09-02'),day('2026-09-03'),'store');
  const d3=manualMetaSpend([entry],day('2026-09-03'),day('2026-09-04'),'store');
  assert.equal(d1+d2+d3,10001);
  assert.equal(manualMetaSpend([entry],day('2026-09-01'),day('2026-09-04'),'trendyol'),0);
  assert.equal(manualMetaSpend([entry],day('2026-09-01'),day('2026-09-04'),'all'),10001);
  assert.equal(matchingManualMetaEntries([entry],day('2026-09-04'),day('2026-09-05'),'all').length,0);
  assert.equal(matchingManualMetaEntries([entry],day('2026-09-01'),day('2026-09-04'),'trendyol').length,0);
  assert.equal(manualMetaEntry({resource_key:key,version:1,payload:{...p,source:'other'}}),null);
});
test('a period without a Meta entry has zero advertising spend',()=>{
  const since=Date.parse('2026-09-01T00:00:00+03:00');
  const until=Date.parse('2026-09-02T00:00:00+03:00');
  assert.deepEqual(matchingManualMetaEntries([],since,until,'all'),[]);
  assert.equal(optionalManualMetaSpend([],since,until,'all'),0);
  assert.equal(optionalManualMetaSpend(null,since,until,'all'),null);
});
