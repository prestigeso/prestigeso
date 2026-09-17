import assert from "node:assert/strict";
import test from "node:test";
import { parseAvailableReturnItems } from "../lib/returns/availability.ts";

const line = { product_id: 1, variant_id: 7, name: "Ürün", purchased: 5, reserved: 1, returned: 2, remaining: 2 };

test("only remaining units populate the customer dialog; consumed variants are omitted", () => {
  assert.deepEqual(parseAvailableReturnItems({ eligible: true, items: [line,
    { ...line, variant_id: 8, returned: 4, remaining: 0 },
  ] }), [{ id: 1, variant_id: 7, lineId: "1:7", name: "Ürün", quantity: 2 }]);
});

test("inactive, malformed, duplicate and non-conserved availability fails closed", () => {
  for (const payload of [null, [], {}, { eligible: false, items: [line] }, { eligible: true, items: [] },
    { eligible: true, items: [line,line] }, { eligible: true, items: [{ ...line, remaining: 3 }] },
    { eligible: true, items: [{ ...line, remaining: -1 }] }, { eligible: true, items: [{ ...line, reserved: 0.5 }] },
    { eligible: true, items: [{ ...line, product_id: -2 }] }, { eligible: true, items: [{ ...line, returned: NaN }] },
    { eligible: true, items: [{ ...line, product_id: true }] }, { eligible: true, items: [{ ...line, variant_id: null }] },
  ]) assert.throws(() => parseAvailableReturnItems(payload));
});

test("distinct variants retain separate return identities", () => {
  const items = parseAvailableReturnItems({ eligible: true, items: [line, { ...line, variant_id: 8 }] });
  assert.equal(items.length, 2);
  assert.notEqual(items[0].lineId, items[1].lineId);
});
