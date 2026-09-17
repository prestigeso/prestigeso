// Synthetic, loopback-only Supabase read fixture for browser/SSR tests.
// SQL integrity and role tests run separately against real isolated PostgreSQL.
import { createServer } from "node:http";
import { createServer as createSecureServer } from "node:https";
import { readFileSync } from "node:fs";

const base = { price: 1000, discount_price: 0, stock: 20, category: "Erkek Kolye",
  description: "Yerel test ürünü. 316L çelik, 70 cm zincir.", image: "/logo.jpeg", images: ["/logo.jpeg"],
  is_bestseller: false, barcode: null, campaign_start_date: null, campaign_end_date: null,
  created_at: "2026-09-01T00:00:00.000Z", updated_at: "2026-09-01T00:00:00.000Z",
  effective_price: 1000, display_base_price: 1000, available_stock: 20, has_variants: false, is_discounted: false };
const products = [247, 377, ...Array.from({ length: 30 }, (_, i) => 400 + i)].map(id => ({ ...base, id, SKU: `TEST-${id}`, name: `Test Çelik Kolye ${id}` }));
const tables = {
  products, products_public_catalog: products,
  product_variants: [], campaigns: [], hero_slides: [],
  categories: [{ id: 1, name: "Erkek Kolye", slug: "erkek-kolye", created_at: base.created_at }],
  public_product_reviews: [], public_product_questions: [],
  product_review_stats: [], product_engagement_stats: [],
  site_settings: [{ key: "shipping", value: { shipping_fee: 50, free_shipping_threshold: 1500, shipping_enabled: true } }, { key: "marquee", value: "Yerel test mağazası" }],
};
let failures = new Set();
const writeAttempts = [];
function matches(row, field, filter) {
  const split = filter.indexOf(".");
  const operator = filter.slice(0, split);
  const value = filter.slice(split + 1);
  const actual = row[field];
  if (operator === "eq") return String(actual) === value;
  if (operator === "neq") return String(actual) !== value;
  if (operator === "gt") return actual > Number(value);
  if (operator === "gte") return typeof actual === "number" ? actual >= Number(value) : actual >= value;
  if (operator === "lt") return actual < Number(value);
  if (operator === "lte") return typeof actual === "number" ? actual <= Number(value) : actual <= value;
  if (operator === "is") return value === "null" ? actual == null : String(actual) === value;
  if (operator === "in") return value.replace(/^\(|\)$/g, "").split(",").map(x => x.replace(/^"|"$/g, "")).includes(String(actual));
  if (operator === "ilike") return String(actual || "").toLocaleLowerCase("tr").includes(value.replaceAll("%", "").toLocaleLowerCase("tr"));
  return false;
}

const handler = async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1:54321");
  const json = (status, body, headers = {}) => { res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS", "Access-Control-Expose-Headers": "Content-Range", ...headers }); res.end(req.method === "HEAD" ? undefined : JSON.stringify(body)); };
  if (req.method === "OPTIONS") return json(204, null);
  if (url.pathname === "/__control" && req.method === "POST") {
    let text = ""; for await (const chunk of req) { text += chunk; if (text.length > 2000) return json(413, {}); }
    try { failures = new Set(JSON.parse(text).failTables || []); return json(200, { ok: true }); } catch { return json(400, {}); }
  }
  if (url.pathname === "/__writes") return json(200, writeAttempts);
  if (url.pathname === "/__health") return json(200, { fixture: true });
  if (!["GET", "HEAD"].includes(req.method)) { writeAttempts.push({ method: req.method, path: url.pathname }); return json(403, { message: "Fixture forbids writes" }); }
  if (url.pathname.startsWith("/auth/")) return json(401, { message: "No authenticated fixture user" });
  const table = url.pathname.replace("/rest/v1/", "");
  if (failures.has(table)) return json(503, { message: "Injected fixture outage", code: "FIXTURE_OUTAGE" });
  if (!(table in tables)) return json(403, { message: "Fixture table not allowed" });
  let rows = tables[table].filter(row => [...url.searchParams].every(([key, value]) => {
    if (["select", "limit", "offset", "order"].includes(key)) return true;
    if (key === "or") return value.replace(/^\(|\)$/g, "").split(",").some(clause => { const dot = clause.indexOf("."); return matches(row, clause.slice(0, dot), clause.slice(dot + 1)); });
    return matches(row, key, value);
  }));
  const total = rows.length;
  const orders = (url.searchParams.get("order") || "").split(",").filter(Boolean);
  rows = rows.toSorted((a, b) => { for (const rule of orders) { const [field, direction] = rule.split("."); const result = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0; if (result) return result * (direction === "desc" ? -1 : 1); } return 0; });
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit") || 1000)));
  rows = rows.slice(offset, offset + limit);
  const single = req.headers.accept?.includes("application/vnd.pgrst.object+json");
  if (single && rows.length !== 1) return json(406, { code: "PGRST116", details: `The result contains ${rows.length} rows`, message: "JSON object requested" });
  json(200, single ? rows[0] : rows, { "Content-Range": rows.length ? `${offset}-${offset + rows.length - 1}/${total}` : `*/${total}` });
};
createServer(handler).listen(54321, "127.0.0.1", () => console.log("Synthetic Supabase read fixture on http://127.0.0.1:54321"));
const [keyPath, certPath] = process.argv.slice(2);
if (keyPath && certPath) createSecureServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, handler)
  .listen(54322, "127.0.0.1", () => console.log("Synthetic TLS Supabase fixture on https://127.0.0.1:54322"));
