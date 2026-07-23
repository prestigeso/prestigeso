export type EffectivePriceInput = {
  basePrice: unknown;
  discountPrice?: unknown;
  campaignPercent?: unknown;
};

function toNonNegativeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function roundUnitPrice(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Fixed product discounts and percentage campaigns do not stack. */
export function getEffectiveUnitPrice({
  basePrice,
  discountPrice,
  campaignPercent,
}: EffectivePriceInput) {
  const base = toNonNegativeNumber(basePrice);
  const candidates = [base];
  const fixed = toNonNegativeNumber(discountPrice);
  if (fixed > 0 && fixed < base) candidates.push(fixed);

  const percent = Number(campaignPercent);
  if (Number.isFinite(percent) && percent > 0 && percent < 100) {
    candidates.push(base * (1 - percent / 100));
  }

  return roundUnitPrice(Math.min(...candidates));
}
