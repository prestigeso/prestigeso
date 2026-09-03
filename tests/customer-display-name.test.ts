import assert from "node:assert/strict";
import test from "node:test";
import { formatCustomerDisplayName } from "../lib/customerDisplayNameValue.ts";

test("public customer names never require an email address", () => {
  assert.equal(formatCustomerDisplayName(null), "Müşteri");
  assert.equal(formatCustomerDisplayName({}), "Müşteri");
});

test("public customer names expose only the first name and surname initial", () => {
  assert.equal(
    formatCustomerDisplayName({ first_name: "Ayşe", last_name: "Demir" }),
    "Ayşe D.",
  );
  assert.equal(
    formatCustomerDisplayName({ first_name: "Ece", last_name: "de Souza" }),
    "Ece S.",
  );
  assert.equal(
    formatCustomerDisplayName({ full_name: "Mehmet Ali Yılmaz" }),
    "Mehmet Y.",
  );
});
