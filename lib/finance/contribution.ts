/** Manual scenario engine, not an accounting ledger or provider attribution report.
 * All amounts are integer minor units. Null is unknown, never an implicit zero.
 */
export const FINANCE_FIELDS = ["revenue", "refunds", "goods", "paymentFees", "packaging", "shipping", "returnCosts", "advertising"] as const;
export type FinanceField = typeof FINANCE_FIELDS[number];
export type ContributionInput = Record<FinanceField, number | null>;
const MAX_MINOR = 100_000_000_000; // Explicit per-field scenario budget: 1 billion TRY.
export function parseTryAmount(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  // No thousands separators, exponent notation, signs or silent precision loss.
  if (!/^\d{1,10}([.,]\d{1,2})?$/.test(value)) throw new Error("INVALID_AMOUNT");
  const [whole, fraction = ""] = value.replace(",", ".").split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor > MAX_MINOR) throw new Error("AMOUNT_LIMIT");
  return minor;
}
export function calculateContribution(input: ContributionInput) {
  for (const field of FINANCE_FIELDS) {
    const value = input[field];
    if (value !== null && (!Number.isSafeInteger(value) || value < 0 || value > MAX_MINOR)) throw new Error("INVALID_MINOR_UNITS");
  }
  if (input.revenue !== null && input.refunds !== null && input.refunds > input.revenue) throw new Error("REFUNDS_EXCEED_COHORT_REVENUE");
  const missing = FINANCE_FIELDS.filter((field) => input[field] === null);
  const netRevenue = input.revenue === null || input.refunds === null ? null : input.revenue - input.refunds;
  const costFields = ["goods", "paymentFees", "packaging", "shipping", "returnCosts"] as const;
  const operatingCosts = costFields.some((field) => input[field] === null) ? null : costFields.reduce((sum, field) => sum + input[field]!, 0);
  const beforeAdvertising = netRevenue === null || operatingCosts === null ? null : netRevenue - operatingCosts;
  const afterAdvertising = beforeAdvertising === null || input.advertising === null ? null : beforeAdvertising - input.advertising;
  // This is blended revenue/spend, NOT Meta-attributed ROAS or causal lift.
  const blendedRevenueToSpend = netRevenue === null || input.advertising === null || input.advertising === 0 ? null : netRevenue / input.advertising;
  return { currency: "TRY" as const, missing, netRevenue, operatingCosts, beforeAdvertising, afterAdvertising,
    marginPercent: afterAdvertising === null || netRevenue === null || netRevenue === 0 ? null : afterAdvertising / netRevenue * 100,
    blendedRevenueToSpend };
}
