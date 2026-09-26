// Scenario only: user supplies a combined effective deduction rate. No inferred
// commission, VAT, stopaj, currency conversion or platform-specific legal rule.
export function breakeven(fixedMinor: number, deductionBps: number, targetMarginBps: number) {
  if (![fixedMinor, deductionBps, targetMarginBps].every(Number.isSafeInteger) || fixedMinor < 0 || fixedMinor > 100_000_000_000 || deductionBps < 0 || targetMarginBps < 0 || deductionBps + targetMarginBps >= 10000) throw new Error('INVALID_SCENARIO');
  const denominator = 10000 - deductionBps - targetMarginBps;
  const price = (BigInt(fixedMinor) * BigInt(10000) + BigInt(denominator) - BigInt(1)) / BigInt(denominator);
  if (price > BigInt(100_000_000_000)) throw new Error('PRICE_LIMIT');
  return Number(price);
}
