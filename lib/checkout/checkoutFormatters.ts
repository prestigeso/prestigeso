import { MAX_EMAIL_LENGTH, MAX_PHONE_LENGTH } from "./checkoutTypes";

export { normalizeText, normalizePhone, isValidTurkishPhone } from "@/lib/utils";
import { normalizeText } from "@/lib/utils";

export function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}


export function normalizeCouponCode(value: string) {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 40);
}

export { formatMoney } from "@/lib/utils";

export function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= MAX_EMAIL_LENGTH;
}

