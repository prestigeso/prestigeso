/** Admin-only, read-only v2 order-package adapter. Explicit operational fields only; no raw payload or identity numbers. */
export type TrendyolConfig = { sellerId: string; apiKey: string; apiSecret: string; environment: "stage" | "production" };
export type PackageQuery = { start: number; end: number; page: number };
export function validatePackageQuery(query: PackageQuery) {
  if (![query.start, query.end, query.page].every(Number.isSafeInteger) || query.start < 0 || query.end <= query.start || query.end - query.start > 14 * 86400000 || query.page < 0 || query.page > 199) throw new Error("QUERY_INVALID");
}
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("PROVIDER_SCHEMA"); return value as Record<string, unknown>; }
function identifier(value: unknown): string {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === "string" && /^[0-9]{1,20}$/.test(value)) return value;
  throw new Error("PROVIDER_SCHEMA");
}
function text(value: unknown, max = 200): string { if (typeof value !== "string" || value.length > max) throw new Error("PROVIDER_SCHEMA"); return value; }
function integer(value: unknown): number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("PROVIDER_SCHEMA"); return value; }
function optionalText(value: unknown, max = 500): string | null {
  if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  return typeof value === "string" && value.trim() && value.length <= max ? value.trim() : null;
}
function optionalNumber(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }
export function safeProviderLink(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}
function address(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const a = value as Record<string, unknown>;
  return { name: optionalText(a.fullName) || [optionalText(a.firstName), optionalText(a.lastName)].filter(Boolean).join(" ") || null,
    address: optionalText(a.fullAddress, 2000) || [optionalText(a.address1), optionalText(a.address2)].filter(Boolean).join(" ") || null,
    city: optionalText(a.city), district: optionalText(a.district), neighborhood: optionalText(a.neighborhood),
    postalCode: optionalText(a.postalCode), country: optionalText(a.countryCode), phone: optionalText(a.phone), company: optionalText(a.company) };
}
export function projectPackages(input: unknown, expectedPage: number) {
  const body = record(input), total = integer(body.totalElements), page = integer(body.page), totalPages = integer(body.totalPages);
  if (total > 10000) throw new Error("NARROW_DATE_RANGE");
  if (page !== expectedPage || !Array.isArray(body.content) || body.content.length > 50 || totalPages > 200) throw new Error("PROVIDER_SCHEMA");
  if (page * 50 < total && body.content.length === 0) throw new Error("PROVIDER_INCOMPLETE");
  const ids = new Set<string>();
  const packages = body.content.map((raw) => {
    const row = record(raw), packageId = identifier(row.shipmentPackageId);
    if (ids.has(packageId)) throw new Error("PROVIDER_DUPLICATE"); ids.add(packageId);
    if (!Array.isArray(row.lines) || row.lines.length > 1000) throw new Error("PROVIDER_SCHEMA");
    const amount = row.packageTotalPrice;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > 1e9) throw new Error("PROVIDER_SCHEMA");
    // Provider amounts are display-only; not converted into paid site revenue.
    return { source: "trendyol" as const, packageId, orderNumber: identifier(row.orderNumber),
      status: text(row.shipmentPackageStatus || row.status, 80), amount,
      currency: text(row.currencyCode, 3), orderDate: integer(row.orderDate),
      shipping: { carrier: optionalText(row.cargoProviderName), trackingNumber: optionalText(row.cargoTrackingNumber), trackingLink: safeProviderLink(row.cargoTrackingLink), senderNumber: optionalText(row.cargoSenderNumber), shipmentNumber: optionalText(row.shipmentNumber) },
      deliveryAddress: address(row.shipmentAddress), billingAddress: address(row.invoiceAddress),
      paymentMethod: optionalText(row.paymentMethod), grossAmount: optionalNumber(row.packageGrossAmount), discount: optionalNumber(row.packageTotalDiscount),
      invoiceLink: safeProviderLink(row.invoiceLink), invoiceNumber: optionalText(row.invoiceNumber), invoiceStatus: optionalText(row.invoiceStatus),
      estimatedDeliveryStart: optionalNumber(row.estimatedDeliveryStartDate), estimatedDeliveryEnd: optionalNumber(row.estimatedDeliveryEndDate), lastModified: optionalNumber(row.lastModifiedDate),
      history: Array.isArray(row.packageHistories) ? row.packageHistories.slice(0, 100).flatMap(h => { if (!h || typeof h !== "object") return []; const event = h as Record<string, unknown>; const status = optionalText(event.status); const date = optionalNumber(event.createdDate); return status && date !== null ? [{ status, date }] : []; }) : [],
      lines: row.lines.map((rawLine) => { const line = record(rawLine); return { sku: text(line.stockCode, 100), name: text(line.productName, 500), quantity: integer(line.quantity), barcode: optionalText(line.barcode), size: optionalText(line.productSize), color: optionalText(line.productColor), unitPrice: optionalNumber(line.lineUnitPrice), grossAmount: optionalNumber(line.lineGrossAmount), discount: optionalNumber(line.lineTotalDiscount), vatRate: optionalNumber(line.vatRate), status: optionalText(line.orderLineItemStatusName), cancelReason: optionalText(line.cancelReason) }; }) };
  });
  return { packages, page, total, totalPages, hasNext: page + 1 < totalPages };
}
export async function fetchTrendyolPackages(config: TrendyolConfig, query: PackageQuery, request: typeof fetch = fetch) {
  validatePackageQuery(query);
  if (!/^[1-9][0-9]{0,15}$/.test(config.sellerId) || !config.apiKey || !config.apiSecret || /[\r\n:]/.test(config.apiKey) || /[\r\n]/.test(config.apiSecret) || !["stage", "production"].includes(config.environment)) throw new Error("CONFIGURATION_REQUIRED");
  const host = config.environment === "production" ? "apigw.trendyol.com" : "stageapigw.trendyol.com";
  const url = new URL(`https://${host}/integration/order/sellers/${config.sellerId}/v2/orders`);
  url.search = new URLSearchParams({ startDate: String(query.start), endDate: String(query.end), page: String(query.page), size: "50", orderByField: "PackageLastModifiedDate", orderByDirection: "DESC" }).toString();
  let response: Response;
  try { response = await request(url, { method: "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000), headers: { Authorization: `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64")}`, "User-Agent": `${config.sellerId} - SelfIntegration`, Accept: "application/json" } }); }
  catch { throw new Error("PROVIDER_UNAVAILABLE"); }
  if (response.status === 401 || response.status === 403) throw new Error("PROVIDER_AUTH");
  if (response.status === 429) throw new Error("PROVIDER_RATE_LIMIT");
  if (!response.ok) throw new Error("PROVIDER_UNAVAILABLE");
  if (Number(response.headers.get("content-length")) > 2 * 1024 * 1024) throw new Error("PROVIDER_RESPONSE_LIMIT");
  const reader = response.body?.getReader(); if (!reader) throw new Error("PROVIDER_SCHEMA");
  let size = 0, json = ""; const decoder = new TextDecoder();
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new Error("PROVIDER_RESPONSE_LIMIT"); } json += decoder.decode(value, { stream: true }); } }
  finally { reader.releaseLock(); }
  let data: unknown; try { data = JSON.parse(json + decoder.decode()); } catch { throw new Error("PROVIDER_SCHEMA"); }
  return projectPackages(data, query.page);
}
