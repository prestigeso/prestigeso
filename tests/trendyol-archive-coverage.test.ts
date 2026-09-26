import { test } from 'node:test';
import assert from 'node:assert/strict';
import { archiveCoverage } from '../lib/trendyol/archive-coverage.ts';

test('archive coverage accepts continuous completed windows with small current lag', () => {
  const day = 86400000;
  const jobs = [
    { starts_at: day, ends_at: 2*day, status: 'complete' },
    { starts_at: 2*day-1000, ends_at: 3*day, status: 'complete' },
  ];
  assert.deepEqual(archiveCoverage(day+1000, 3*day+1000, jobs), { complete: true, firstAvailableAt: day, checkedThrough: 3*day });
});

test('archive coverage rejects old, incomplete and gapped histories', () => {
  const day = 86400000;
  const jobs = [
    { starts_at: day, ends_at: 2*day, status: 'complete' },
    { starts_at: 2*day+3600000, ends_at: 3*day, status: 'complete' },
    { starts_at: 3*day, ends_at: 4*day, status: 'ready' },
  ];
  assert.equal(archiveCoverage(0, 3*day, jobs).complete, false);
  assert.equal(archiveCoverage(day+1000, 3*day, jobs).complete, false);
  assert.equal(archiveCoverage(2*day+3600000, 4*day, jobs).complete, false);
  assert.equal(archiveCoverage(day, 3*day, []).complete, false);
});
