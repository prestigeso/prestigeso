/** Versioned, deliberately closed browser-event vocabulary. No free-form payloads. */
export const ANALYTICS_SCHEMA_VERSION = 1 as const;
export const MAX_ANALYTICS_BATCH = 20;

const rules = {
  page_view: [],
  category_view: ["categoryId"],
  product_view: ["productId"],
  product_click: ["productId", "position"],
  list_impression: ["productId", "position"],
  add_cart: ["productId", "cartId", "quantity"],
  remove_cart: ["productId", "cartId", "quantity"],
  update_cart: ["productId", "cartId", "quantity"],
  begin_checkout: ["cartId", "attemptId"],
  payment_attempt: ["cartId", "attemptId"],
  checkout_error: ["cartId", "attemptId", "reason"],
  checkout_step: ["cartId", "attemptId", "step"],
  search: ["resultCount"],
  filter: ["filterCount"],
  active_time: ["seconds"],
  block_impression: ["block"],
  block_click: ["block"],
} as const;

export type BrowserEvent = {
  version: typeof ANALYTICS_SCHEMA_VERSION;
  eventId: string;
  visitorId: string;
  sessionId: string;
  sequence: number;
  type: keyof typeof rules;
  page: "home" | "shop" | "product" | "checkout" | "other";
  productId?: number;
  categoryId?: number;
  position?: number;
  cartId?: string;
  attemptId?: string;
  quantity?: number;
  variantId?: number;
  resultCount?: number;
  filterCount?: number;
  seconds?: number;
  block?: "hero" | "category" | "products";
  reason?: "validation" | "otp" | "technical" | "rejected" | "unknown";
  step?: "cart" | "identity" | "address" | "contract" | "otp" | "payment";
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const common = ["version", "eventId", "visitorId", "sessionId", "sequence", "type", "page"];
const positive = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;

/** The HTTP boundary must additionally enforce body bytes, origin, consent and rate limits.
 * UUIDs are pseudonyms, NOT authentication. The caller cannot submit paid/revenue events.
 */
export function parseBrowserEvents(input: unknown): BrowserEvent[] | null {
  if (!Array.isArray(input) || input.length < 1 || input.length > MAX_ANALYTICS_BATCH) return null;
  const result: BrowserEvent[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const row = raw as Record<string, unknown>;
    if (typeof row.type !== "string" || !Object.hasOwn(rules, row.type)) return null;
    const required: readonly string[] = rules[row.type as keyof typeof rules];
    const keys = new Set([...common, ...required]);
    const variantAllowed = required.includes("productId");
    if (variantAllowed && Object.hasOwn(row, "variantId")) keys.add("variantId");
    if (Object.keys(row).some((key) => !keys.has(key)) || [...common, ...required].some((key) => !Object.hasOwn(row, key))) return null;
    if (row.version !== ANALYTICS_SCHEMA_VERSION || !positive(row.sequence)) return null;
    if (!["home", "shop", "product", "checkout", "other"].includes(String(row.page))) return null;
    for (const key of ["eventId", "visitorId", "sessionId", ...required.filter((key) => key === "cartId" || key === "attemptId")]) {
      if (typeof row[key] !== "string" || !uuid.test(row[key] as string)) return null;
    }
    for (const key of required.filter((key) => !["cartId", "attemptId", "reason", "step", "block", "resultCount"].includes(key))) {
      if (!positive(row[key])) return null;
    }
    if (typeof row.quantity === "number" && row.quantity > 999) return null;
    if (typeof row.position === "number" && row.position > 10000) return null;
    if ("variantId" in row && !positive(row.variantId)) return null;
    if ("resultCount" in row && (typeof row.resultCount !== "number" || !Number.isSafeInteger(row.resultCount) || row.resultCount < 0 || row.resultCount > 1000000)) return null;
    if ("seconds" in row && Number(row.seconds) > 30) return null;
    if ("filterCount" in row && Number(row.filterCount) > 20) return null;
    if ("reason" in row && !["validation", "otp", "technical", "rejected", "unknown"].includes(String(row.reason))) return null;
    if ("step" in row && !["cart", "identity", "address", "contract", "otp", "payment"].includes(String(row.step))) return null;
    if ("block" in row && !["hero", "category", "products"].includes(String(row.block))) return null;
    // Copy only the approved shape; never retain arbitrary objects supplied by a client.
    result.push(Object.fromEntries([...keys].map((key) => [key, row[key]])) as BrowserEvent);
  }
  return result;
}
