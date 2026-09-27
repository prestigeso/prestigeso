import test from 'node:test';
import assert from 'node:assert/strict';
import { currentCategoryName } from '../lib/catalog/categoryAliases.ts';

test('removed category links resolve to the requested destination', () => {
  for (const old of ['Dekoratif Obje ve Biblo', 'Masa Süsleri', 'Tavla', 'Satranç']) {
    assert.equal(currentCategoryName(old), 'Masa Setleri');
  }
  assert.equal(currentCategoryName('Tesbihler'), 'Tespihler');
  assert.equal(currentCategoryName('Küpe'), 'Küpeler');
  assert.equal(currentCategoryName('Erkek Kolye'), 'Erkek Kolye');
});
