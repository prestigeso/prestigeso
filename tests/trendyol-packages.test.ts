import test from "node:test";
import assert from "node:assert/strict";
import { fetchTrendyolPackages, projectPackages, validatePackageQuery, safeProviderLink } from "../lib/trendyol/packages.ts";
const config = { sellerId: "123", apiKey: "fixture-key", apiSecret: "fixture-secret", environment: "stage" as const };
const query = { start: 1789000000000, end: 1789086400000, page: 0 };
const fixture = () => ({ totalElements: 1, totalPages: 1, page: 0, size: 50, content: [{ shipmentPackageId: 42, orderNumber: "12345", shipmentPackageStatus: "Created", packageTotalPrice: 1000, currencyCode: "TRY", orderDate: query.start, customerEmail: "private@example.invalid", identityNumber: "secret", shipmentAddress: { phone: "secret" }, lines: [{ stockCode: "Q316", productName: "Test kolye", quantity: 1 }] }] });

test("Trendyol operational details preserve codes, zero and missing fields without leaking raw identities", () => {
 const input=fixture(); Object.assign(input.content[0], {cargoTrackingNumber:"000123456789",cargoProviderName:"Test Kargo",cargoTrackingLink:"https://tracking.trendyol.com/?id=test",packageTotalDiscount:0,shipmentAddress:{fullName:"Test Alıcı",fullAddress:"Sentetik adres",phone:"05000000000",identityNumber:"NEVER-EXPOSE"},packageHistories:[{status:"Shipped",createdDate:query.start}],invoiceLink:"javascript:alert(1)"});
 const p=projectPackages(input,0).packages[0];
 assert.equal(p.shipping.trackingNumber,"000123456789");assert.equal(p.discount,0);assert.equal(p.grossAmount,null);assert.equal(p.deliveryAddress?.name,"Test Alıcı");assert.equal(p.invoiceLink,null);assert.equal(p.history[0].status,"Shipped");assert.doesNotMatch(JSON.stringify(p),/NEVER-EXPOSE|identityNumber|private@example/);
 for(const url of ["javascript:alert(1)","data:text/html,x","http://example.com","https://user:pass@example.com"] )assert.equal(safeProviderLink(url),null);
 assert.equal(projectPackages(fixture(),0).packages[0].shipping.trackingNumber,null);
});
test("Trendyol adapter uses fixed stage v2 host, GET only, no redirect or cache", async () => {
  let calls = 0;
  const request: typeof fetch = async (url, init) => { calls++; assert.equal(new URL(String(url)).hostname, "stageapigw.trendyol.com"); assert.match(String(url), /sellers\/123\/v2\/orders/); assert.equal(init?.method, "GET"); assert.equal(init?.redirect, "error"); assert.equal(init?.cache, "no-store"); assert.equal(new Headers(init?.headers).get("User-Agent"), "123 - SelfIntegration"); return Response.json(fixture()); };
  const result = await fetchTrendyolPackages(config, query, request);
  assert.equal(calls, 1); assert.equal(result.packages[0].packageId, "42");
  assert.doesNotMatch(JSON.stringify(result), /private|identityNumber|shipmentAddress/);
});
test("Trendyol rejects bad query/config before network and never accepts custom host", async () => {
  const request: typeof fetch = async () => { throw new Error("NETWORK_WAS_CALLED"); };
  for (const q of [{ ...query, page: -1 }, { ...query, page: 200 }, { ...query, end: query.start + 15 * 86400000 }, { ...query, start: NaN }]) assert.throws(() => validatePackageQuery(q));
  await assert.rejects(fetchTrendyolPackages({ ...config, sellerId: "123/../../evil" }, query, request), /CONFIGURATION_REQUIRED/);
});
test("Trendyol auth/rate errors are sanitized and not retried", async () => {
  for (const [status, code] of [[401, "PROVIDER_AUTH"], [403, "PROVIDER_AUTH"], [429, "PROVIDER_RATE_LIMIT"], [500, "PROVIDER_UNAVAILABLE"]] as const) {
    let calls = 0; await assert.rejects(fetchTrendyolPackages(config, query, async () => { calls++; return new Response("secret-upstream-body", { status }); }), new RegExp(code)); assert.equal(calls, 1);
  }
});
test("Trendyol does not silently truncate over-capacity, duplicates or missing pages", () => {
  assert.throws(() => projectPackages({ ...fixture(), totalElements: 10001 }, 0), /NARROW_DATE_RANGE/);
  const d = fixture(); d.content.push(d.content[0]); assert.throws(() => projectPackages(d, 0), /PROVIDER_DUPLICATE/);
  assert.throws(() => projectPackages({ ...fixture(), content: [] }, 0), /PROVIDER_INCOMPLETE/);
  assert.throws(() => projectPackages(fixture(), 1), /PROVIDER_SCHEMA/);
  assert.equal(projectPackages({ totalElements: 0, totalPages: 0, page: 0, content: [] }, 0).packages.length, 0);
});
test("Trendyol unsafe identifiers, malformed amounts and oversized streams reject", async () => {
  const d = fixture(); d.content[0].shipmentPackageId = Number.MAX_SAFE_INTEGER + 1; assert.throws(() => projectPackages(d, 0), /PROVIDER_SCHEMA/);
  await assert.rejects(fetchTrendyolPackages(config, query, async () => new Response("x".repeat(2 * 1024 * 1024 + 1))), /PROVIDER_RESPONSE_LIMIT/);
  await assert.rejects(fetchTrendyolPackages(config, query, async () => new Response("not-json")), /PROVIDER_SCHEMA/);
});
